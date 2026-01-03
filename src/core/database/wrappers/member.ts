import type { BaseInteraction } from 'discord.js';
import { Model } from '../models';
import { type PopulatedGuild, type PopulatedMember, type PopulatedUser } from '../select';
import { guildWrapper } from './guild';
import { userWrapper } from './user';
import { DatabaseWrapper } from './wrapper';
import type { GuildInteraction } from '@core/commands/types';

interface FindMemberOptions {
  userId: string;
  guildId: string;
  resolveUser?: boolean;
  resolveGuild?: boolean;
}

class MemberWrapper extends DatabaseWrapper<Model.Member> {
  constructor() {
    super(Model.Member);
  }

  readonly resolve = async (
    options: FindMemberOptions,
  ): Promise<PopulatedMember> => {
    const {
      userId,
      guildId,
      resolveGuild = true,
      resolveUser = true,
    } = options;

    const member = await this.findUnique({
      GuildId_UserId: {
        GuildId: guildId,
        UserId: userId,
      },
    });

    const guildPromise = resolveGuild
      ? guildWrapper.resolve(guildId)
      : Promise.resolve(null);
    const userPromise = resolveUser
      ? userWrapper.resolve(userId)
      : Promise.resolve(null);

    await Promise.all([guildPromise, userPromise]);

    const resolvedMember =
      member ?? (await this.create({ GuildId: guildId, UserId: userId }));

    return resolvedMember;
  };

  readonly resolveAndReturnGuild = async (
    options: FindMemberOptions,
  ): Promise<[PopulatedMember, PopulatedGuild]> => {
    const {
      userId,
      guildId,
      resolveGuild = true,
      resolveUser = true,
    } = options;

    const member = await this.findUnique({
      GuildId_UserId: {
        GuildId: guildId,
        UserId: userId,
      },
    });

    const guildPromise = resolveGuild
      ? guildWrapper.resolve(guildId)
      : Promise.resolve(null);
    const userPromise = resolveUser
      ? userWrapper.resolve(userId)
      : Promise.resolve(null);

    const [guild] = await Promise.all([guildPromise, userPromise]);

    const resolvedMember =
      member ?? (await this.create({ GuildId: guildId, UserId: userId }));

    return [
      resolvedMember,
      guild ?? (await guildWrapper.resolve(guildId)),
    ] as const;
  };

  async resolveFromInteraction<I extends BaseInteraction>(
    interaction: GuildInteraction<I>,
  ): Promise<readonly [PopulatedGuild, PopulatedMember, PopulatedUser]> {
    const [user, guild] = await Promise.all([
      userWrapper.resolve(interaction.user.id),
      guildWrapper.resolve(interaction.guildId),
    ]);

    const member = await memberWrapper.resolve({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      resolveGuild: false,
      resolveUser: false,
    });

    return [guild, member, user];
  }
}

const memberWrapper = new MemberWrapper();

export { memberWrapper, type FindMemberOptions };
