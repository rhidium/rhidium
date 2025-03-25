import { Severity } from '@prisma/client';
import {
  ChatInputCommand,
  Database,
  InteractionUtils,
  PermLevel,
  severityChoices,
} from '@core';
import { SlashCommandBuilder } from 'discord.js';
import { ModerationServices } from '../../services/moderation';

const SeverityCommand = new ChatInputCommand({
  guildOnly: true,
  isEphemeral: true,
  permLevel: PermLevel.Administrator,
  data: new SlashCommandBuilder()
    .setName('severity')
    .setDescription('Configure how many warnings each severity level is worth.')
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
        .setDescription('The amount of warnings this severity level is worth.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(25),
    ),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const { options, guild: discordGuild } = interaction;
    const severity = options.getString('severity', true) as Severity;
    const _value = options.getInteger('value', true);

    const [guild] = await Promise.all([
      Database.Guild.resolve(discordGuild.id),
      SeverityCommand.deferReplyInternal(interaction),
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
          client.embeds.error(
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
        client.embeds.success(
          `The severity level **\`${severity}\`** is now worth **${valueAfter}** warnings.`,
        ),
      ],
    });
  },
});

export default SeverityCommand;
