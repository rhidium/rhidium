import {
  Command,
  CommandInteraction,
  CommandThrottleType,
  ThrottleConsumerResult,
} from '@core/commands';
import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';
import { Prisma, prismaClient } from '../client';
import { CacheManager } from '@core/data-structures';
import { UnitConstants } from '@core/constants';
import { populateCommandUsage, PopulatedCommandUsage } from '../select';
import { Logger } from '@core/logger';

const commandUsageSelect = {
  usages: true,
  runtime: true,
  runtimeErrors: true,
};

const throttleCache = CacheManager.fromStore<
  Prisma.CommandUsageGetPayload<{ select: typeof commandUsageSelect }>
>({
  max: 1000,
  ttl: UnitConstants.MS_IN_ONE_MINUTE * 5,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

class CommandWrapper extends DatabaseWrapper<Model.Command> {
  constructor() {
    super(Model.Command);
  }

  private readonly cooldownKey = (
    command: Command,
    interaction: CommandInteraction,
  ): string => {
    let resource: string | null;
    const options = command.throttleOptions;

    switch (options.type) {
      case CommandThrottleType.User:
      case CommandThrottleType.Member:
        resource = interaction.user.id;
        break;
      case CommandThrottleType.Guild:
        resource = interaction.inGuild()
          ? interaction.guildId
          : interaction.user.id;
        break;
      case CommandThrottleType.Channel:
        resource = interaction.channelId ?? interaction.user.id;
        break;
      case CommandThrottleType.Global:
        resource = null;
        break;
      default:
        throw new Error(`Unknown throttle type: ${options.type}`);
    }

    if (typeof resource === 'string') {
      resource = `${options.type}:${resource}`;
    } else {
      resource = `${options.type}`;
    }

    return `${command.id}:${resource}`;
  };

  public readonly throttleConsumer = async (
    command: Command,
    interaction: CommandInteraction,
  ): Promise<ThrottleConsumerResult> => {
    const options = command.throttleOptions;

    if (!options.enabled) {
      return {
        ok: true,
        expiresAt: interaction.createdTimestamp,
      };
    }

    const key = this.cooldownKey(command, interaction);
    const before =
      (await throttleCache.get(key)) ??
      (await prismaClient.commandUsage.findUnique({
        where: {
          key,
        },
        select: commandUsageSelect,
      }));

    const activeEarliestFirst: Date[] = [];

    if (before) {
      activeEarliestFirst.push(
        ...before.usages
          .filter((date) => date.valueOf() + options.duration > Date.now())
          .sort((a, b) => a.getTime() - b.getTime()),
      );

      if (activeEarliestFirst.length >= options.limit) {
        return {
          ok: false,
          expiresAt: activeEarliestFirst[0]
            ? activeEarliestFirst[0].valueOf() + options.duration
            : Date.now() + options.duration,
        };
      }

      activeEarliestFirst.push(interaction.createdAt);

      await throttleCache.set(
        key,
        await prismaClient.commandUsage.update({
          where: {
            key,
          },
          data: {
            usages: {
              set: activeEarliestFirst,
            },
            consumedUsageCount: {
              increment: before.usages.length - activeEarliestFirst.length,
            },
            expireThreshold: new Date(
              interaction.createdAt.valueOf() + options.duration,
            ),
          },
          select: commandUsageSelect,
        }),
        options.duration * 2,
      );
    } else {
      activeEarliestFirst.push(interaction.createdAt);
      await throttleCache.set(
        key,
        await prismaClient.commandUsage.create({
          data: {
            key,
            usages: [interaction.createdAt],
            consumedUsageCount: 0,
            CommandId: command.id,
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            expireThreshold: new Date(
              interaction.createdAt.valueOf() + options.duration,
            ),
            runtime: 0,
            runtimeErrors: [],
          },
          select: commandUsageSelect,
        }),
        options.duration * 2,
      );
    }

    return {
      ok: true,
      expiresAt: activeEarliestFirst[0]
        ? activeEarliestFirst[0].valueOf() + options.duration
        : Date.now() + options.duration,
    };
  };

  public readonly afterCommandRun = async (
    command: Command,
    interaction: CommandInteraction,
    runtimeMs: number,
    runtimeError: string | null,
  ): Promise<void> => {
    const key = this.cooldownKey(command, interaction);

    await prismaClient.commandUsage.upsert({
      where: {
        key,
      },
      create: {
        key,
        usages: [interaction.createdAt],
        consumedUsageCount: 0,
        CommandId: command.id,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        expireThreshold: new Date(
          interaction.createdAt.valueOf() + command.throttleOptions.duration,
        ),
        runtime: runtimeMs,
        runtimeErrors: runtimeError ? [runtimeError] : [],
      },
      update: {
        runtime: {
          increment: runtimeMs,
        },
        runtimeErrors: runtimeError
          ? {
              push: runtimeError,
            }
          : undefined,
      },
    });
  };

  /**
   * Summarizes command usage for the day. Should be called once
   * a day, preferably at midnight UTC, or a couple seconds after.
   */
  public readonly summarizeCommandUsage = async () => {
    const endOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const startOfDay = new Date(
      endOfDay.valueOf() - UnitConstants.MS_IN_ONE_DAY + 1,
    );

    const matched = await prismaClient.commandUsage.findMany({
      where: {
        expireThreshold: {
          lte: endOfDay,
          gte: startOfDay,
        },
      },
      ...populateCommandUsage,
    });

    const matchedKeys = matched.map((usage) => usage.key);
    const groupedByCommandId = matched.reduce(
      (acc, usage) => {
        const commandId = usage.CommandId;
        if (!acc[commandId]) {
          acc[commandId] = [];
        }
        acc[commandId].push(usage);
        return acc;
      },
      {} as Record<string, PopulatedCommandUsage[]>,
    );

    const anyExists = await prismaClient.commandUsageSummary.findFirst({
      where: {
        date: startOfDay,
      },
    });

    if (anyExists) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Command usage summary for date ${startOfDay} already exists`,
        );
      } else {
        Logger.warn(
          `Command usage summary for date ${startOfDay} already exists, deleting old data`,
        );
        await prismaClient.commandUsageSummary.deleteMany({
          where: {
            date: startOfDay,
          },
        });
      }
    }

    await Promise.all([
      throttleCache.clear(),
      prismaClient.commandUsage.deleteMany({
        where: {
          key: {
            in: matchedKeys,
          },
        },
      }),
    ]);

    for (const commandId in groupedByCommandId) {
      const usages = groupedByCommandId[commandId] as PopulatedCommandUsage[];
      const runtimeAvgs = usages.map((usage) =>
        usage.runtime === 0 || usage.usages.length === 0
          ? 0
          : usage.runtime / usage.usages.length,
      );

      await prismaClient.commandUsageSummary.create({
        data: {
          CommandId: commandId,
          date: startOfDay,
          totalUsages: usages.reduce(
            (acc, usage) =>
              acc + usage.consumedUsageCount + usage.usages.length,
            0,
          ),
          uniqueUsers: new Set(usages.map((usage) => usage.userId)).size,
          uniqueChannels: new Set(
            usages
              .filter((usage) => usage.channelId)
              .map((usage) => usage.channelId),
          ).size,
          uniqueGuilds: new Set(
            usages
              .filter((usage) => usage.guildId)
              .map((usage) => usage.guildId),
          ).size,
          uniqueErrors: [
            ...new Set(
              usages
                .flatMap((usage) => usage.runtimeErrors)
                .filter((error) => error !== null),
            ),
          ],
          runtimeTot: usages.reduce((acc, usage) => acc + usage.runtime, 0),
          runtimeAvg: runtimeAvgs.length
            ? runtimeAvgs.reduce((acc, runtime) => acc + runtime, 0) /
              runtimeAvgs.length
            : 0,
          runtimeMin: Math.min(...runtimeAvgs),
          runtimeMax: Math.max(...runtimeAvgs),
          runtimeMea: runtimeAvgs.length
            ? runtimeAvgs.reduce((acc, runtime) => acc + runtime, 0) /
              runtimeAvgs.length
            : 0,
          runtimeMed: runtimeAvgs.length
            ? runtimeAvgs.sort((a, b) => a - b)[
                Math.floor(runtimeAvgs.length / 2)
              ]!
            : 0,
          runtimeVar: runtimeAvgs.length
            ? runtimeAvgs.reduce(
                (acc, runtime) => acc + Math.pow(runtime - runtimeAvgs[0]!, 2),
                0,
              ) / runtimeAvgs.length
            : 0,
          runtimeStD: runtimeAvgs.length
            ? Math.sqrt(
                runtimeAvgs.reduce(
                  (acc, runtime) =>
                    acc + Math.pow(runtime - runtimeAvgs[0]!, 2),
                  0,
                ) / runtimeAvgs.length,
              )
            : 0,
        },
      });
    }
  };
}

const commandWrapper = new CommandWrapper();

export { commandWrapper };
