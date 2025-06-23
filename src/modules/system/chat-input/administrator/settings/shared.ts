import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  RepliableInteraction,
} from 'discord.js';
import {
  PermissionSetting,
  permissionSettings,
  sendableChannelFormatter,
  SendableChannelSetting,
  sendableChannelSettings,
  SettingsKey,
} from './types';
import { groupedSettingsPrompts, settingsPrompts } from './prompts';
import { CacheManager } from '@core/data-structures';
import Client from '@core/client';
import { GuildInteraction, Permissions, PermLevel } from '@core/commands';
import { EmbedConstants, UnitConstants } from '@core/constants';
import { AuditLogType, Database, PopulatedGuild } from '@core/database';
import {
  ArrayUtils,
  InteractionPagination,
  InteractionUtils,
  PaginationPage,
  Prompt,
  PromptDisplay,
  PromptInteractionHandler,
  PromptResolver,
  PromptType,
  PromptValue,
  StringUtils,
} from '@core/utils';
import { appConfig, Embeds } from '@core/config';

type CommandChoices = {
  name: string;
  value: string;
}[];

const commandChoicesCache = CacheManager.fromStore<CommandChoices>({
  max: 1000,
  ttl: UnitConstants.MS_IN_ONE_MINUTE * 5,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

const commandChoicesFromCache = async (
  client: Client<true>,
  interaction: GuildInteraction<RepliableInteraction>,
): Promise<CommandChoices> => {
  const cacheId = `${interaction.guildId}:${interaction.member.id}`;
  const cached = await commandChoicesCache.get(cacheId);

  if (cached) {
    return cached;
  }

  const memberPermLevel = await Permissions.resolveForMember(
    interaction.member,
    interaction.guild,
  );

  // Note: We only include commands with Adminstrator permission level or lower,
  // If we include Guild Owner commands, the admin submission values (select menu)
  // would not include any guild owner commands, unsetting them.
  const maxLevel = Math.min(memberPermLevel, PermLevel.Administrator);
  const data =
    client.manager.apiCommands
      .filter((c) => c.enabled.global && c.permissions.level <= maxLevel)
      .map((cmd) => ({
        name: cmd.data.name,
        value: cmd.id,
      })) ?? [];

  await commandChoicesCache.set(cacheId, data);

  return data;
};

export const settingsEmbed = async (
  i: GuildInteraction<RepliableInteraction>,
  guild: PopulatedGuild,
  defaultCategoryInd?: number,
) => {
  const categories: (Omit<APIEmbedField, 'value'> & {
    value: APIEmbedField[];
    overview: string;
    components: PaginationPage['components'];
  })[] = Object.entries(groupedSettingsPrompts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, prompts]) => ({
      name: category,
      inline: false,
      overview: prompts.map((prompt) => prompt.name).join(', '),
      components: ArrayUtils.chunk(prompts.slice(0, 20), 5).map((chunk) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          chunk.map((prompt) =>
            new ButtonBuilder()
              .setCustomId(`settings-update@${prompt.id}`)
              .setLabel(prompt.name)
              .setStyle(ButtonStyle.Secondary),
          ),
        ),
      ),
      value: prompts.sort(PromptDisplay.sortByCategory).map((prompt) => ({
        name: prompt.name,
        value: StringUtils.truncate(
          (prompt.message
            ? `-# ${prompt.message}${
                prompt.display?.infoSuffix
                  ? ` ${prompt.display?.infoSuffix}`
                  : ''
              }\n`
            : '') +
            '- ' +
            PromptResolver.defaultFormatter(
              prompt,
              guild[prompt.accessor],
              '\n- ',
              {
                error: appConfig.emojis.error,
                success: appConfig.emojis.success,
              },
              sendableChannelSettings.includes(
                prompt.accessor as SendableChannelSetting,
              )
                ? {
                    channel: (value) =>
                      sendableChannelFormatter(i.guild, prompt, value, {
                        error: appConfig.emojis.error,
                        success: appConfig.emojis.success,
                      }),
                  }
                : undefined,
            ),
          EmbedConstants.FIELD_VALUE_MAX_LENGTH,
        ),
        inline: prompt.display?.inline ?? false,
      })),
    }));

  await InteractionPagination.paginator({
    interaction: i,
    type: 'select',
    ephemeral: true,
    defaultPage: defaultCategoryInd,
    handleResponses: false,
    selectId: 'settings-category',
    pages: categories.map((category) => ({
      label: category.name,
      description: category.overview,
      content: '',
      embeds: [
        Embeds.info({
          title: `Server Settings - ${category.name}`,
          fields: category.value,
        }),
      ],
      components: category.components,
    })),
  });
};

export const handleSettingsUpdate = async (
  client: Client<true>,
  interaction: GuildInteraction<RepliableInteraction>,
  isShortSetup: boolean,
  setting: string | null,
) => {
  const guildUpdater = async (
    guildId: string,
    prompt: Prompt,
    accessor: SettingsKey,
    value: PromptValue<boolean, PromptType, boolean>,
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
          prompt,
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
    defaultValue: () =>
      Database.Guild.resolve(interaction.guildId).then((g) => {
        guildBefore = g;

        return g[prompt.accessor];
      }),
    onCollect:
      prompt.onCollect ??
      (async (value: PromptValue<boolean, PromptType, boolean>) => {
        const guild = await Database.Guild.resolve(interaction.guildId);

        if (
          Array.isArray(guild[prompt.accessor]) || Array.isArray(value)
            ? JSON.stringify(guild[prompt.accessor]) === JSON.stringify(value)
            : guild[prompt.accessor] === value
        ) {
          return;
        }

        if (permissionSettings.includes(prompt.accessor as PermissionSetting)) {
          await commandChoicesCache.clearByPrefix(`${interaction.guildId}:`);
          await Permissions.clearCacheForGuild(interaction.guildId);
        }

        return guildUpdater(
          interaction.guild.id,
          prompt,
          prompt.accessor,
          value,
        );
      }),
  }));

  const disabledCommandsPrompt = guildSettingsPrompts.find(
    (p) => p.id === 'disabled-commands',
  );

  if (disabledCommandsPrompt) {
    disabledCommandsPrompt.choices = await commandChoicesFromCache(
      client,
      interaction,
    );
  }

  const guildSettingPrompt = setting
    ? ((guildSettingsPrompts as Prompt[]).find((p) => p.id === setting) ?? null)
    : null;
  const prompts = guildSettingPrompt
    ? [guildSettingPrompt]
    : guildSettingsPrompts.filter((p) => !isShortSetup || p.required);

  let guildBefore: PopulatedGuild | null = null;

  if (!InteractionUtils.isAcknowledged(interaction)) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  }

  await PromptInteractionHandler.handlePromptInteraction(
    interaction,
    prompts as Prompt[],
    {
      async onFinish(_promptValues, i) {
        await settingsEmbed(
          i,
          await Database.Guild.resolve(i.guildId),
          guildSettingPrompt
            ? PromptDisplay.getCategoryIndex(
                guildSettingPrompt,
                groupedSettingsPrompts,
              )
            : 0,
        );
      },
    },
  );
};
