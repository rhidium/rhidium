import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { SettingsPrompts } from './types';
import {
  appConfig,
  ChatInputCommand,
  InteractionUtils,
  Prompts,
  PromptUtils,
  StringUtils,
} from '@core';

export const settingsPrompts: SettingsPrompts = [
  {
    id: 'admin-role-id',
    type: 'role',
    name: 'Administrator Role',
    message: 'The role required to use administrator commands.',
    // defaultValue: 'Administrator',
    required: false,
    multiple: false,
    accessor: 'adminRoleId',
    updater: async (guild) => {
      return guild.adminRoleId;
    },
  },
  {
    id: 'audit-log-channel-id',
    type: 'channel',
    name: 'Audit Log Channel',
    message: 'The channel where administrative actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'adminLogChannelId',
    updater: async (guild) => {
      return guild.adminLogChannelId;
    },
  },
  {
    id: 'mod-role-id',
    type: 'role',
    name: 'Moderator Role',
    message: 'The role required to use moderator commands.',
    required: false,
    multiple: false,
    accessor: 'modRoleId',
    updater: async (guild) => {
      return guild.modRoleId;
    },
  },
  {
    id: 'mod-log-channel-id',
    type: 'channel',
    name: 'Moderation Log Channel',
    message: 'The channel where moderation actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildVoice],
    accessor: 'modLogChannelId',
    updater: async (guild) => {
      return guild.modLogChannelId;
    },
  },
  {
    id: 'auto-role-ids',
    type: 'role',
    name: 'Auto Roles',
    message: 'Roles that are automatically assigned to new members.',
    required: true,
    multiple: true,
    minValues: 0,
    maxValues: 25,
    accessor: 'autoRoleIds',
    updater: async (guild) => {
      return guild.autoRoleIds;
    },
  },
  {
    id: 'member-join-channel-id',
    type: 'channel',
    name: 'Member Join Channel',
    message: 'The channel where member join messages are sent.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'memberJoinChannelId',
    updater: async (guild) => {
      return guild.memberJoinChannelId;
    },
  },
  {
    id: 'member-leave-channel-id',
    type: 'channel',
    name: 'Member Leave Channel',
    message: 'The channel where member leave messages are sent.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'memberLeaveChannelId',
    updater: async (guild) => {
      return guild.memberLeaveChannelId;
    },
  },
] as const;

// [DEV] Click outside of modal before submit = BREAKS
// [DEV] Skip button, Cancel options, etc.

const testPrompts: Prompts = [
  {
    type: 'number',
    id: 'number-required-single-choices',
    name: 'Single Required Number',
    message: 'Test',
    multiple: false,
    required: true,
    defaultValue: 8,
    // minValue: 3,
    // maxValue: 13,
    choices: [
      { name: 'Test 1', value: 1 },
      { name: 'Test 2', value: 2 },
      { name: 'Test 3', value: 3 },
    ],
  },
  {
    type: 'role',
    id: 'role-required-single',
    name: 'Single Required Role',
    message: 'Test',
    multiple: false,
    required: true,
    defaultValue: 'Administrator',
  },
  {
    type: 'string',
    id: 'string-required-single',
    name: 'Single Required String',
    message: 'Test',
    multiple: false,
    required: true,
    defaultValue: 'Default Value',
    minLength: 3,
    maxLength: 13,
  },
  {
    type: 'string',
    id: 'string-required-multiple',
    name: 'Multiple Required Strings',
    message: 'Test',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 2,
    minLength: 3,
    maxLength: 15,
    defaultValue: ['Default Value 1', 'Default Value 2'],
  },
  {
    type: 'string',
    id: 'string-required-multiple-choices',
    name: 'Multiple Required Strings (Choices)',
    message: 'Test',
    required: true,
    multiple: true,
    defaultValue: ['test3'],
    minValues: 1,
    maxValues: 2,
    choices: [
      { name: 'Test 1', value: 'test1' },
      { name: 'Test 2', value: 'test2' },
      { name: 'Test 3', value: 'test3' },
    ],
  },
];

PromptUtils.validatePrompts(testPrompts);

const isProduction = appConfig.NODE_ENV === 'production';

const SettingsCommand = new ChatInputCommand({
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure server settings.'),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    console.log(
      await PromptUtils.handlePromptInteraction(interaction, testPrompts, {
        async onPromptError(error, i, prompt) {
          console.error(error);
          const ctx = {
            embeds: [
              client.embeds.error({
                title: 'Something went wrong',
                description: error.message,
                fields: isProduction
                  ? []
                  : [
                      {
                        name: 'Prompt',
                        value: `\`\`\`json\n${JSON.stringify(prompt, null, 2)}\n\`\`\``,
                        inline: true,
                      },
                      {
                        name: 'Stack Trace',
                        value: `\`\`\`js\n${error.stack}\n\`\`\``,
                        inline: true,
                      },
                    ],
              }),
            ],
          };

          if (i.replied || i.deferred) await i.editReply(ctx);
          else await i.reply(ctx);
        },
        contextTransformer(prompt, prompts, index, collected) {
          const isLast = index === prompts.length - 1;
          const remaining = prompts.length - index - 1;
          const collectedSliced = (collected?.slice(-10) ?? []).reverse();
          const collectedString = `${collectedSliced
            .map((c) => StringUtils.truncate(c, 100))
            .map((c) => `- \`${c}\``)
            .join('\n')}${
            (collected?.length ?? 0) > 10
              ? `\n... and ${collected!.length - 10} more`
              : ''
          }`;

          return {
            content: !isLast
              ? `Question **${index + 1}** of **${prompts.length}**, ${remaining} more question${
                  remaining === 1 ? '' : 's'
                } after this`
              : 'Last question',
            embeds: [
              client.embeds.info({
                title: prompt.name,
                description: prompt.message,
                fields:
                  collected === null
                    ? []
                    : [
                        {
                          name: 'Your have provided the following values so far:',
                          value: collectedString,
                          inline: true,
                        },
                      ],
              }),
            ],
          };
        },
      }),
    );
  },
});

export default SettingsCommand;
