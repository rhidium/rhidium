import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { SettingsKey, SettingsPrompts } from './types';
import {
  appConfig,
  AuditLogType,
  ChatInputCommand,
  Database,
  InteractionUtils,
  PopulatedGuild,
  Prompts,
  PromptType,
  PromptUtils,
  PromptValue,
  StringUtils,
} from '@core';
import { testPrompts } from './test';

// [DEV] Validator function, for example, check if we have permissions to post in channels, etc.

export const settingsPrompts: SettingsPrompts = [
  {
    id: 'admin-roles',
    type: 'role',
    name: 'Administrator Roles',
    message: 'Roles that have full access to all administrative commands.',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 5,
    // defaultValue: 'Administrator', [DEV]
    accessor: 'adminRoleIds',
  },
  {
    id: 'audit-log-channel-id',
    type: 'channel',
    name: 'Audit Log Channel',
    message: 'The channel where administrative actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'auditLogChannelId',
  },
  {
    id: 'mod-role-id',
    type: 'role',
    name: 'Moderator Role',
    message: 'Roles that have access to all moderation commands.',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 5,
    accessor: 'modRoleIds',
  },
  {
    id: 'mod-log-channel-id',
    type: 'channel',
    name: 'Moderation Log Channel',
    message: 'The channel where moderation actions are logged.',
    required: false,
    multiple: false,
    channelTypes: [ChannelType.GuildText],
    accessor: 'modLogChannelId',
  },
  {
    id: 'auto-role-ids',
    type: 'role',
    name: 'Auto Roles',
    message:
      'Please select between 0 and 25 roles that should be automatically assigned to new members.',
    required: true,
    multiple: true,
    minValues: 0,
    maxValues: 25,
    accessor: 'autoRoleIds',
  },
  //   {
  //     id: 'member-join-channel-id',
  //     type: 'channel',
  //     name: 'Member Join Channel',
  //     message: 'The channel where member join messages are sent.',
  //     required: false,
  //     multiple: false,
  //     channelTypes: [ChannelType.GuildText],
  //     accessor: 'memberJoinChannelId',
  //   },
  //   {
  //     id: 'member-leave-channel-id',
  //     type: 'channel',
  //     name: 'Member Leave Channel',
  //     message: 'The channel where member leave messages are sent.',
  //     required: false,
  //     multiple: false,
  //     channelTypes: [ChannelType.GuildText],
  //     accessor: 'memberLeaveChannelId',
  //   },
] as const;

// [DEV] Click outside of modal before submit = BREAKS
// [DEV] Skip button, Cancel options, etc.

PromptUtils.validatePrompts(settingsPrompts);
PromptUtils.validatePrompts(testPrompts);

const isProduction: boolean = appConfig.NODE_ENV === 'production';

const SettingsCommand = new ChatInputCommand({
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure server settings.'),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    let guildBefore: PopulatedGuild | null = null;

    const guildUpdater = async (
      guildId: string,
      accessor: SettingsKey,
      value: PromptValue<boolean, PromptType, boolean, false>,
    ) => {
      return Database.Guild.update({
        where: { id: guildId },
        data: {
          [accessor]: value,
        },
      }).then(async (updatedGuild) => {
        void Database.AuditLog.util({
          client,
          guild: updatedGuild,
          type: AuditLogType.GUILD_SETTINGS_UPDATE,
          user: interaction.user.id,
          data: {
            before:
              guildBefore ??
              (await Database.Guild.resolve(interaction.guildId).then((g) => {
                guildBefore = g;

                return g;
              })),
            after: updatedGuild,
          },
        });

        return updatedGuild;
      });
    };

    const guildSettingsPrompts = settingsPrompts.map((prompt) => ({
      ...prompt,
      defaultValue:
        prompt.defaultValue ??
        (() =>
          Database.Guild.resolve(interaction.guildId).then((g) => {
            guildBefore = g;

            return g[prompt.accessor];
          })),
      onCollect:
        prompt.onCollect ??
        (async (value: PromptValue<boolean, PromptType, boolean, false>) => {
          const guild = await Database.Guild.resolve(interaction.guildId);

          if (
            Array.isArray(guild[prompt.accessor]) || Array.isArray(value)
              ? JSON.stringify(guild[prompt.accessor]) === JSON.stringify(value)
              : guild[prompt.accessor] === value
          ) {
            return;
          }

          return guildUpdater(interaction.guild.id, prompt.accessor, value);
        }),
    }));

    const t = await PromptUtils.handlePromptInteraction(
      interaction,
      guildSettingsPrompts as Prompts,
      {
        resolveResources: false,
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
        contextTransformer(
          prompt,
          prompts,
          index,
          collected,
          errorFeedbackFields,
        ) {
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

          const embedFn = errorFeedbackFields.length
            ? client.embeds.error
            : client.embeds.info;

          return {
            content: !isLast
              ? `Question **${index + 1}** of **${prompts.length}**, ${remaining} more question${
                  remaining === 1 ? '' : 's'
                } after this`
              : 'Last question',
            embeds: [
              embedFn({
                title: prompt.name,
                description: prompt.message,
                fields:
                  collected === null
                    ? [...errorFeedbackFields]
                    : [
                        ...errorFeedbackFields,
                        {
                          name: 'Your have provided the following values so far:',
                          value: collectedString,
                          inline: false,
                        },
                      ],
              }),
            ],
          };
        },
      },
    );

    console.log(t);
  },
});

export default SettingsCommand;
