import { Severity } from '@prisma/client';
import { ModerationServices } from '../services/moderation';
import { Command, CommandType, PermLevel } from '@core/commands';
import { Database, severityChoices } from '@core/database';
import { Embeds } from '@core/config';

const SeverityCommand = new Command({
  type: CommandType.ChatInputPlain,
  enabled: {
    guildOnly: true,
  },
  permissions: {
    level: PermLevel.Administrator,
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
    refuseUncached: true,
  },
  data: (builder) =>
    builder
      .setName('severity')
      .setDescription(
        'Configure how many warnings each severity level is worth.',
      )
      .addStringOption((option) =>
        option
          .setName('severity')
          .setDescription('The severity level to configure.')
          .setRequired(true)
          .setChoices(severityChoices),
      )
      .addIntegerOption((option) =>
        option
          .setName('value')
          .setDescription(
            'The amount of warnings this severity level is worth.',
          )
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(25),
      ),
  run: async (_client, interaction) => {
    const { options, guild: discordGuild } = interaction;
    const severity = options.getString('severity', true) as Severity;
    const _value = options.getInteger('value', true);

    const [guild] = await Promise.all([
      Database.Guild.resolve(discordGuild.id),
    ]);

    const valueBefore = ModerationServices.getSeverityValue(
      severity,
      guild.SeverityConfiguration,
    );
    const { LOW, MEDIUM, HIGH } =
      ModerationServices.defaultSeverityConfiguration;
    const valueAfter = ModerationServices.getSeverityValue(severity, {
      GuildId: guild.id,
      LOW: guild.SeverityConfiguration?.LOW ?? LOW,
      MEDIUM: guild.SeverityConfiguration?.MEDIUM ?? MEDIUM,
      HIGH: guild.SeverityConfiguration?.HIGH ?? HIGH,
      [severity]: _value,
    });

    if (valueBefore === valueAfter) {
      await SeverityCommand.reply(interaction, {
        embeds: [
          Embeds.error(
            `The severity level **\`${severity}\`** is already worth **${valueAfter}** warnings.`,
          ),
        ],
      });
      return;
    }

    await Database.Guild.update({
      where: { id: guild.id },
      data: {
        SeverityConfiguration: {
          upsert: {
            where: { GuildId: guild.id },
            create: {
              LOW: guild.SeverityConfiguration?.LOW ?? LOW,
              MEDIUM: guild.SeverityConfiguration?.MEDIUM ?? MEDIUM,
              HIGH: guild.SeverityConfiguration?.HIGH ?? HIGH,
              [severity]: _value,
            },
            update: {
              [severity]: _value,
            },
          },
        },
      },
    });

    await SeverityCommand.reply(interaction, {
      embeds: [
        Embeds.success(
          `The severity level **\`${severity}\`** is now worth **${valueAfter}** warnings.`,
        ),
      ],
    });
  },
});

export default SeverityCommand;
