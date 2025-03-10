import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';
import { ChatInputCommand, Client, StringUtils } from '@rhidium/core';
import { appConfig } from '@/config';
import { Lang } from 'lib/i18n';

/** Note: Not localized for obvious reasons */
export const helpDescription = async (client: Client) => {
  const commandLink = client.commandManager.commandLink;
  return [
    '## Introduction\n',
    'I am a bot designed to help you get started on your projects quickly, ',
    'without having to worry about any project bootstrapping.\n',
    '### Features\n',
    'I have a lot of built-in features by default, here are some of them:\n',
    '1. **Auto-roles** - Automatically assign roles to new members\n',
    '2. **Welcome/Goodbye messages** - Send messages when a member joins or leaves\n',
    '3. **Moderation** - Kick, ban, mute, and more\n',
    '4. **Custom commands** - Create custom commands for your server\n',
    '5. **Customizable** - Customize me to your liking\n',
    '6. **Auto-completion** - Auto-complete commands and arguments\n',
    '7. **Slash commands** - Use slash commands to interact with me\n',
    '8. **Permissions** - Use permissions to control who can do what\n',
    '9. **Logging** - Log moderation actions and more\n',
    '10. **And more!** - There are a lot more features, too many to list here\n',
    '### Getting Started\n',
    `1. Configure your Administrator role and logging-channel using ${await commandLink('admin')}\n`,
    `2. Configure your Moderation resources using ${await commandLink('moderator')}\n`,
    `3. Set-up some auto-roles with ${await commandLink('auto-roles')}\n`,
    `4. Configure your welcome messages using ${await commandLink('welcome')}\n`,
    `5. Configure your goodbye messages using ${await commandLink('goodbye')}\n`,
    '\n',
    `**Note**: You can use ${await commandLink('commands')} to learn `,
    'more about a command and what it does.\n',
  ].join('');
};

const HelpCommand = new ChatInputCommand({
  isEphemeral: true,
  data: new SlashCommandBuilder(),
  run: async (client, interaction) => {
    // Defer our reply internally, uses cmd#deferReply
    await HelpCommand.deferReplyInternal(interaction);

    // Create overview embed
    const embed = client.embeds.branding({
      description: await helpDescription(client),
      footer: {
        text: Lang.t('general:requestedBy', {
          username: interaction.user.username,
        }),
        iconURL: interaction.user.displayAvatarURL(),
      },
    });

    // Resolve our link components
    const components = [];
    const linksRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...Object.entries(appConfig.urls ?? {}).map(([key, value]) =>
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(StringUtils.titleCase(key.replaceAll('_', ' ')))
          .setURL(value),
      ),
    );

    if (linksRow.components.length >= 1) components.push(linksRow);

    await HelpCommand.reply(interaction, {
      embeds: [embed],
      components,
    });
  },
});

export default HelpCommand;
