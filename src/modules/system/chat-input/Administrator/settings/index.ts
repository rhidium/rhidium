import {
  APIEmbedField,
  ChannelType,
  RepliableInteraction,
  SlashCommandBuilder,
} from 'discord.js';
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

// [DEV] Select menu option for pagination
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
    displayCategory: 'Permissions',
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
    displayCategory: 'Logging',
  },
  {
    id: 'mod-role-id',
    type: 'role',
    name: 'Moderator Roles',
    message: 'Roles that have access to all moderation commands.',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 5,
    accessor: 'modRoleIds',
    displayCategory: 'Permissions',
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
    displayCategory: 'Logging',
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
    displayCategory: 'Member Management',
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
  //     displayCategory: 'Member Management',
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
  //     displayCategory: 'Member Management',
  //   },
] as const;

const byDisplayCategory = (
  a: (typeof settingsPrompts)[0],
  b: (typeof settingsPrompts)[0],
) =>
  a.displayCategory === b.displayCategory
    ? 0
    : a.displayCategory === undefined
      ? 1
      : b.displayCategory === undefined
        ? -1
        : a.displayCategory.localeCompare(b.displayCategory);

const groupByDisplayCategory = (prompts: (typeof settingsPrompts)[0][]) => {
  const grouped: Record<string, (typeof settingsPrompts)[0][]> = {};

  prompts.forEach((prompt) => {
    const category = prompt.displayCategory ?? 'Uncategorized';

    if (!grouped[category]) grouped[category] = [];

    grouped[category].push(prompt);
  });

  return grouped;
};

const groupedSettingsPrompts = groupByDisplayCategory(settingsPrompts);

const settingsChoices = settingsPrompts.map((prompt, ind) => ({
  name: prompt.name,
  value: `${ind}`,
}));

// [DEV] Click outside of modal before submit = BREAKS
// [DEV] Skip button, Cancel options, etc.

PromptUtils.validatePrompts(settingsPrompts);
PromptUtils.validatePrompts(testPrompts);

const isProduction: boolean = appConfig.NODE_ENV === 'production';

const SettingsCommand = new ChatInputCommand({
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure server settings.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('display')
        .setDescription('Display current settings.')
        .addStringOption((option) =>
          option
            .setName('setting')
            .setDescription('The setting to display.')
            .setRequired(false)
            .addChoices(settingsChoices),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('update')
        .setDescription('Update server settings.')
        .addStringOption((option) =>
          option
            .setName('setting')
            .setDescription('The setting to update.')
            .setRequired(false)
            .addChoices(settingsChoices),
        ),
    ),
  run: async (client, interaction) => {
    if (!InteractionUtils.requireAvailableGuild(client, interaction)) return;

    const { options } = interaction;
    const subcommand = options.getSubcommand(true);

    const settingsEmbed = async (
      i: RepliableInteraction,
      guild: PopulatedGuild,
    ) => {
      const categories: (Omit<APIEmbedField, 'value'> & {
        value: APIEmbedField[];
      })[] = Object.entries(groupedSettingsPrompts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, prompts]) => ({
          name: category,
          value: prompts.sort(byDisplayCategory).map((prompt) => ({
            name: prompt.name,
            value:
              (prompt.message ? `-# ${prompt.message}\n` : '') +
              '- ' +
              PromptUtils.defaultFormatter(
                prompt,
                guild[prompt.accessor],
                '\n- ',
              ),
            inline: prompt.displayInline ?? false,
          })),
          inline: false,
        }));

      const categoriesDisplay = categories
        .map((e) => e.name)
        .join(' ' + appConfig.emojis.separator + ' ');

      await InteractionUtils.paginator(
        `settings-${i.guildId}-${Date.now()}`,
        client,
        categories.map((category, ind) => ({
          content: `Page ${ind + 1} of ${categories.length}.`,
          embeds: [
            client.embeds.info({
              title: `Server Settings - ${category.name}`,
              fields: category.value,
              footer: {
                text: `Categories: ${categoriesDisplay}`,
              },
            }),
          ],
        })),
        interaction,
      );
    };

    switch (subcommand) {
      case 'update': {
        const setting = options.getString('setting', false);
        const settingIndex = setting ? parseInt(setting, 10) : null;

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
                  (await Database.Guild.resolve(interaction.guildId).then(
                    (g) => {
                      guildBefore = g;

                      return g;
                    },
                  )),
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
            (async (
              value: PromptValue<boolean, PromptType, boolean, false>,
            ) => {
              const guild = await Database.Guild.resolve(interaction.guildId);

              if (
                Array.isArray(guild[prompt.accessor]) || Array.isArray(value)
                  ? JSON.stringify(guild[prompt.accessor]) ===
                    JSON.stringify(value)
                  : guild[prompt.accessor] === value
              ) {
                return;
              }

              return guildUpdater(interaction.guild.id, prompt.accessor, value);
            }),
        }));

        const guildSettingPrompt =
          settingIndex === null ? null : guildSettingsPrompts[settingIndex];
        const prompts = guildSettingPrompt
          ? [guildSettingPrompt]
          : guildSettingsPrompts;

        let guildBefore: PopulatedGuild | null = null;

        await PromptUtils.handlePromptInteraction(
          interaction,
          prompts as Prompts,
          {
            resolveResources: false,
            async onFinish(_promptValues, i) {
              await settingsEmbed(i, await Database.Guild.resolve(i.guildId));
            },
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
        break;
      }
      case 'display':
      default: {
        const setting = options.getString('setting', false);

        const [guild] = await Promise.all([
          Database.Guild.resolve(interaction.guildId),
          interaction.deferReply(),
        ]);

        if (!setting) {
          await settingsEmbed(interaction, guild);
        }

        break;
      }
    }
  },
});

export default SettingsCommand;
