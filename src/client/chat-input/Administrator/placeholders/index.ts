import { SlashCommandBuilder } from 'discord.js';
import { PlaceholderConstants } from './enums';
import {
  discordPlaceholders,
  groupedDiscordPlaceholders,
} from '@/placeholders';
import {
  listPlaceholderSubcommandGroup,
  placeholderInfoSubcommand,
} from './options';
import PlaceholderGroupOption from '@/auto-completes/placeholder-group';
import PlaceholderOption from '@/auto-completes/placeholder';
import { stripIndents } from 'common-tags';
import ConfigureEmbedsCommand from '../embeds';
import { ChatInputCommand, InteractionUtils, PermLevel } from '@rhidium/core';
import { Lang } from 'lib/i18n';

const PlaceholdersCommand = new ChatInputCommand({
  permLevel: PermLevel.Administrator,
  guildOnly: true,
  data: new SlashCommandBuilder()
    .addSubcommand(placeholderInfoSubcommand)
    .addSubcommandGroup(listPlaceholderSubcommandGroup),
  run: async (client, interaction) => {
    const { options } = interaction;
    const subcommand = options.getSubcommand(true);
    const subcommandGroup = options.getSubcommandGroup(false);

    const guildAvailable = InteractionUtils.requireAvailableGuild(
      client,
      interaction,
    );
    if (!guildAvailable) return;

    const manageEmbedCommand = await client.commandManager.commandLink(
      ConfigureEmbedsCommand.data.name,
    );
    if (subcommand === PlaceholderConstants.PLACEHOLDER_INFO_SUBCOMMAND_NAME) {
      const embed = client.embeds.branding({
        title: Lang.t('commands:placeholders.placeholderInfoTitle'),
        description: stripIndents(
          Lang.t('commands:placeholders.placeholderInfo', {
            user: 'user',
            username: interaction.member.user.username,
            command: manageEmbedCommand,
            interpolation: { escapeValue: false },
          }),
        ),
        fields: [
          {
            name: Lang.t('commands:placeholders.placeholderGroups'),
            value: `\`\`\`${Object.keys(groupedDiscordPlaceholders).length}\`\`\``,
            inline: true,
          },
          {
            name: Lang.t('commands:placeholders.placeholders'),
            value: `\`\`\`${Object.keys(discordPlaceholders).length}\`\`\``,
            inline: true,
          },
        ],
      });
      await PlaceholdersCommand.reply(interaction, embed);
      return; // escape early
    }

    switch (subcommandGroup) {
      case PlaceholderConstants.LIST_SUBCOMMAND_GROUP_NAME:
      default: {
        switch (subcommand) {
          case PlaceholderConstants.LIST_PLACEHOLDER_GROUPS_SUBCOMMAND_NAME: {
            const placeholderGroup = options.getString(
              PlaceholderGroupOption.name,
              true,
            );
            const resolvedGroup = groupedDiscordPlaceholders[placeholderGroup];
            if (!resolvedGroup) {
              const embed = client.embeds.error(
                Lang.t('commands:placeholders.placeholderGroupNotFound', {
                  group: placeholderGroup,
                }),
              );
              await PlaceholdersCommand.reply(interaction, embed);
              return;
            }

            const longestKey = Object.keys(resolvedGroup).reduce((a, b) =>
              a.length > b.length ? a : b,
            );
            const centerPadKey = (key: string) =>
              key
                .padStart((longestKey.length + key.length) / 2, ' ')
                .padEnd(longestKey.length, ' ');

            const embed = client.embeds.branding({
              title: `${Lang.t('commands:placeholders.availablePlaceholders')} ${placeholderGroup}`,
              description: Object.entries(resolvedGroup)
                .map(([k, v]) => `**\`{{${centerPadKey(k)}}}\`** ${v}`)
                .join('\n'),
            });
            await PlaceholdersCommand.reply(interaction, embed);
            break;
          }
          case PlaceholderConstants.LIST_PLACEHOLDERS_SUBCOMMAND_NAME:
          default: {
            const placeholder = options.getString(PlaceholderOption.name, true);
            const cleanPlaceholder = placeholder.replace(/{{|}}/g, '');
            const placeholderValue =
              discordPlaceholders[
                cleanPlaceholder as keyof typeof discordPlaceholders
              ];
            if (!placeholderValue) {
              const embed = client.embeds.error(
                Lang.t('commands:placeholders.placeholderNotFound', {
                  placeholder: cleanPlaceholder,
                }),
              );
              await PlaceholdersCommand.reply(interaction, embed);
              return;
            }

            const embed = client.embeds.branding({
              title: `${Lang.t('commands:placeholders.placeholderDefinition')} ${cleanPlaceholder}`,
              description: `**\`${placeholder}\`**\n\`\`\`${placeholderValue}\`\`\``,
            });
            await PlaceholdersCommand.reply(interaction, embed);
            break;
          }
        }
      }
    }
  },
});

export default PlaceholdersCommand;
