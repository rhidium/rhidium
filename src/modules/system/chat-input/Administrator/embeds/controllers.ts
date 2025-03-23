import ConfigureEmbedsCommand from '.';
import { configureEmbedOptions } from './options';
import {
  configureEmbedInputToEmbedData,
  embedFromEmbedModel,
  resolveConfigureEmbedData,
  settingsKeyFromEmbedOption,
} from './helpers';
import { EmbedController, EmbedFieldController } from './types';
import {
  ComponentType,
  EmbedBuilder,
  EmbedField,
  resolveColor,
} from 'discord.js';
import {
  configureEmbedAcceptedRow,
  configureEmbedControlRow,
} from './components';
import { Prisma } from '@prisma/client';
import { EmbedConfigurationConstants } from './enums';
import {
  Lang,
  EmbedConstants,
  InteractionUtils,
  UnitConstants,
  buildPlaceholders,
  replacePlaceholdersAcrossEmbed,
  replacePlaceholders,
  Database,
  InputUtils,
  AuditLogType,
} from '@core';

export const configureEmbedController: EmbedController = async (
  client,
  interaction,
  guildSettings,
) => {
  const options = interaction.options;
  const embedOptionInput = options.getInteger(
    EmbedConfigurationConstants.EMBED_COMMAND_OPTION_NAME,
    true,
  );

  const settingKey = settingsKeyFromEmbedOption(embedOptionInput);
  const setting = guildSettings[settingKey];

  const nullableByNone = (value: string | null) =>
    value === 'none' ? null : (value ?? undefined);

  const embedData = Object.fromEntries(
    configureEmbedOptions.map((option) => {
      const value = options.getString(option.name);
      return [option.name, nullableByNone(value)];
    }),
  );

  const { embed: configureEmbedData, message: configureEmbedMessage } =
    configureEmbedInputToEmbedData(embedData);
  const embedFromSetting = setting
    ? embedFromEmbedModel(setting)
    : new EmbedBuilder();
  const rawEmbed = resolveConfigureEmbedData(
    configureEmbedData,
    embedFromSetting,
  );

  const placeholders = buildPlaceholders(
    interaction.channel,
    interaction.guild,
    interaction.member,
    interaction.user,
  );
  const embed = replacePlaceholdersAcrossEmbed(rawEmbed, placeholders);
  const resolvedMessage = configureEmbedMessage
    ? replacePlaceholders(configureEmbedMessage, placeholders)
    : null;

  const messageSuffix = resolvedMessage ? `\n\n${resolvedMessage}` : '';
  const msg = await ConfigureEmbedsCommand.reply(interaction, {
    content: `${Lang.t('commands:embeds.previewPrompt')}${messageSuffix}`,
    embeds: [embed],
    components: [configureEmbedControlRow],
    withResponse: true,
  });

  if (!msg) {
    await ConfigureEmbedsCommand.reply(
      interaction,
      client.embeds.error(Lang.t('commands:embeds.previewFailed')),
    );
    return;
  }

  let i;
  try {
    i = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: UnitConstants.MS_IN_ONE_MINUTE * 5,
      filter: (i) =>
        i.customId === EmbedConfigurationConstants.CONFIGURE_CONTINUE ||
        i.customId === EmbedConfigurationConstants.CONFIGURE_CANCEL,
    });
  } catch {
    await ConfigureEmbedsCommand.reply(
      interaction,
      client.embeds.error(Lang.t('commands:embeds.configurationExpired')),
    );
    return;
  }

  if (i.customId === EmbedConfigurationConstants.CONFIGURE_CANCEL) {
    await i.update({
      content: Lang.t('commands:embeds.configurationCancelled'),
      components: [],
    });
    return;
  }

  let upsertId = guildSettings[`${settingKey}Id`] ?? null;
  if (upsertId === null) {
    console.log(
      settingKey,
      `${settingKey}Id`,
      guildSettings[`${settingKey}Id`],
    );

    const updated = await Database.Guild.update({
      where: { id: guildSettings.id },
      data: {
        [settingKey]: {
          create: {},
        },
      },
    });
    upsertId = updated[`${settingKey}Id`];

    if (!upsertId) {
      client.logger.error(
        "Embed configuration failed, setting id reference field couldn't be resolved!",
      );
      await i.update({
        content: Lang.t('commands:embeds.missingUpsertId'),
        components: [],
      });
      return;
    }
  }

  await ConfigureEmbedsCommand.deferReplyInternal(i);

  const fields =
    configureEmbedData.fields
      .filter((field) => {
        const [name, value] = field.split(';');
        return name && value;
      })
      .map((field) => {
        const [name, value, inline] = field.split(';');
        return {
          name: name as string,
          value: value as string,
          inline: inline === 'true',
        };
      }) ?? [];

  const upsertData: {
    messageText?: string | null;
    color?: number | null;
    authorName?: string | null;
    authorIconURL?: string | null;
    authorURL?: string | null;
    title?: string | null;
    description?: string | null;
    url?: string | null;
    imageURL?: string | null;
    thumbnailURL?: string | null;
    footerText?: string | null;
    footerIconURL?: string | null;
    fields?: { create: EmbedField[] };
  } = {};

  if (options.getString('color') || rawEmbed.data.color)
    upsertData.color = configureEmbedData.color
      ? resolveColor(`#${configureEmbedData.color.replaceAll('#', '')}`)
      : null;
  if (options.getString('message') || configureEmbedMessage === null) {
    upsertData.messageText = configureEmbedMessage ?? null;
  }
  if (
    options.getString('author-name') ||
    configureEmbedData.authorName === null
  ) {
    upsertData.authorName = configureEmbedData.authorName ?? null;
  }
  if (
    options.getString('author-icon-url') ||
    configureEmbedData.authorIconUrl === null
  ) {
    upsertData.authorIconURL = configureEmbedData.authorIconUrl ?? null;
  }
  if (
    options.getString('author-url') ||
    configureEmbedData.authorUrl === null
  ) {
    upsertData.authorURL = configureEmbedData.authorUrl ?? null;
  }
  if (options.getString('title') || configureEmbedData.title === null) {
    upsertData.title = configureEmbedData.title ?? null;
  }
  if (
    options.getString('description') ||
    configureEmbedData.description === null
  ) {
    upsertData.description = configureEmbedData.description ?? null;
  }
  if (options.getString('url') || configureEmbedData.url === null) {
    upsertData.url = configureEmbedData.url ?? null;
  }
  if (options.getString('image-url') || configureEmbedData.imageUrl === null) {
    upsertData.imageURL = configureEmbedData.imageUrl ?? null;
  }
  if (
    options.getString('thumbnail-url') ||
    configureEmbedData.thumbnailUrl === null
  ) {
    upsertData.thumbnailURL = configureEmbedData.thumbnailUrl ?? null;
  }
  if (
    options.getString('footer-text') ||
    configureEmbedData.footerText === null
  ) {
    upsertData.footerText = configureEmbedData.footerText ?? null;
  }
  if (
    options.getString('footer-icon-url') ||
    configureEmbedData.footerIconUrl === null
  ) {
    upsertData.footerIconURL = configureEmbedData.footerIconUrl ?? null;
  }
  if (fields.length > 0) upsertData.fields = { create: fields };

  const newTotalFields = (setting?.fields?.length ?? 0) + fields.length;
  if (newTotalFields > EmbedConstants.MAX_FIELDS_LENGTH) {
    await i.editReply(
      Lang.t('commands:embeds.maxFieldSize', {
        max: EmbedConstants.MAX_FIELDS_LENGTH,
      }),
    );
    await interaction.editReply({
      components: [configureEmbedAcceptedRow],
    });
    return;
  }

  const createEmbedColor = configureEmbedData.color
    ? resolveColor(`#${configureEmbedData.color.replaceAll('#', '')}`)
    : null;
  const createEmbedData: Prisma.EmbedCreateInput = {
    GuildId: guildSettings.id,
    messageText: configureEmbedMessage ?? null,
    color: createEmbedColor ?? null,
    authorName: configureEmbedData.authorName ?? null,
    authorIconURL: configureEmbedData.authorIconUrl ?? null,
    authorURL: configureEmbedData.authorUrl ?? null,
    title: configureEmbedData.title ?? null,
    description: configureEmbedData.description ?? null,
    url: configureEmbedData.url ?? null,
    imageURL: configureEmbedData.imageUrl ?? null,
    thumbnailURL: configureEmbedData.thumbnailUrl ?? null,
    footerText: configureEmbedData.footerText ?? null,
    footerIconURL: configureEmbedData.footerIconUrl ?? null,
    fields: { create: fields },
  };

  const updatedGuild = await Database.Guild.update({
    where: { id: guildSettings.id },
    data: {
      [settingKey]: {
        upsert: {
          update: upsertData,
          create: createEmbedData,
          where: {
            id: upsertId,
          },
        },
      },
    },
  });
  const updatedEmbed = updatedGuild[settingKey];

  await i.deleteReply();
  await interaction.editReply({
    content: `${Lang.t('commands:embeds.configurationSaved')}${messageSuffix}`,
    components: [configureEmbedAcceptedRow],
    allowedMentions: { parse: [] },
  });

  const newEmbedData = 'embeds' in msg ? msg.embeds[0] : null;
  if (!newEmbedData) return;

  void Database.AuditLog.util({
    client,
    guild: updatedGuild,
    type: AuditLogType.EMBED_UPDATED,
    user: interaction.user.id,
    data: {
      before: setting,
      after: updatedEmbed,
    },
  });
};

export const manageEmbedFieldsController: EmbedFieldController = async (
  client,
  interaction,
  guildSettings,
  setting,
) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand(true);
  const embedOptionInput = options.getInteger(
    EmbedConfigurationConstants.EMBED_COMMAND_OPTION_NAME,
    true,
  );
  const settingKey = settingsKeyFromEmbedOption(embedOptionInput);

  switch (subcommand) {
    case EmbedConfigurationConstants.MANAGE_FIELDS_ADD: {
      if (!setting) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(Lang.t('commands:embeds.editEmbedMissing')),
        );
        return;
      }

      const name = options.getString('name', true);
      const value = options.getString('value', true);
      const inline = options.getBoolean('inline') ?? true;

      if (setting.fields.length === EmbedConstants.MAX_FIELDS_LENGTH) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(
            Lang.t('commands:embeds.maxFieldSize', {
              max: EmbedConstants.MAX_FIELDS_LENGTH,
            }),
          ),
        );
        return;
      }

      const newField: EmbedField = {
        name,
        value,
        inline,
      };

      const updatedGuild = await Database.Guild.update({
        where: { id: guildSettings.id },
        data: {
          [settingKey]: {
            update: {
              fields: {
                create: [newField],
              },
            },
          },
        },
      });
      const updatedSetting = updatedGuild[settingKey];

      if (!updatedSetting) {
        throw new Error(
          'Unable to resolve working setting after field addition',
        );
      }

      const rawEmbed = embedFromEmbedModel(updatedSetting);
      const placeholders = buildPlaceholders(
        interaction.channel,
        interaction.guild,
        interaction.member,
        interaction.user,
      );
      const embed = replacePlaceholdersAcrossEmbed(rawEmbed, placeholders);
      const resolvedMessage = updatedSetting.messageText
        ? replacePlaceholders(updatedSetting.messageText, placeholders)
        : null;
      const messageSuffix = resolvedMessage ? `\n\n${resolvedMessage}` : '';

      await ConfigureEmbedsCommand.reply(interaction, {
        content: `${Lang.t('commands:embeds.fieldsEditPreview')}${messageSuffix}`,
        embeds: [embed],
      });

      void Database.AuditLog.util({
        client,
        guild: updatedGuild,
        type: AuditLogType.EMBED_FIELD_ADDED,
        user: interaction.user.id,
        data: {
          before: null,
          after: newField,
        },
      });

      break;
    }

    case EmbedConfigurationConstants.MANAGE_FIELDS_REMOVE: {
      if (!setting) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(Lang.t('commands:embeds.removeEmbedMissing')),
        );
        return;
      }

      const index = options.getInteger('index', true);
      if (index < 1 || index > setting.fields.length) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(
            Lang.t('commands:embeds.indexOutsideRange', {
              max: setting.fields.length,
            }),
          ),
        );
        return;
      }

      const targetField = setting.fields[index - 1];
      if (!targetField) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(
            Lang.t('commands:embeds.indexFieldNotFound', {
              index,
              max: setting.fields.length,
            }),
          ),
        );
        return;
      }

      const updatedGuild = await Database.Guild.update({
        where: { id: guildSettings.id },
        data: {
          [settingKey]: {
            update: {
              fields: {
                delete: { id: targetField.id },
              },
            },
          },
        },
      });
      const updatedSetting = updatedGuild[settingKey];

      if (!updatedSetting) {
        throw new Error(
          'Unable to resolve working setting after field removal',
        );
      }

      const rawEmbed = embedFromEmbedModel(updatedSetting);
      const placeholders = buildPlaceholders(
        interaction.channel,
        interaction.guild,
        interaction.member,
        interaction.user,
      );
      const embed = replacePlaceholdersAcrossEmbed(rawEmbed, placeholders);
      const resolvedMessage = updatedSetting.messageText
        ? replacePlaceholders(updatedSetting.messageText, placeholders)
        : null;
      const messageSuffix = resolvedMessage ? `\n\n${resolvedMessage}` : '';

      await ConfigureEmbedsCommand.reply(interaction, {
        content: `${Lang.t('commands:embeds.fieldRemovedPreview')}${messageSuffix}`,
        embeds: [embed],
      });

      void Database.AuditLog.util({
        client,
        guild: updatedGuild,
        type: AuditLogType.EMBED_FIELD_REMOVED,
        user: interaction.user.id,
        data: {
          before: targetField,
          after: null,
        },
      });
      break;
    }

    case EmbedConfigurationConstants.MANAGE_FIELDS_RESET: {
      if (!setting) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(
            Lang.t('commands:embeds.fieldsResetEmbedMissing'),
          ),
        );
        return;
      }

      await InputUtils.Confirmation.promptConfirmation({
        client,
        interaction,
        async onConfirm(i) {
          const updatedGuild = await Database.Guild.update({
            where: { id: guildSettings.id },
            data: {
              [settingKey]: {
                update: {
                  fields: {
                    deleteMany: {},
                  },
                },
              },
            },
          });
          const updatedSetting = updatedGuild[settingKey];

          if (!updatedSetting) {
            throw new Error(
              'Unable to resolve working setting after resetting fields',
            );
          }

          const rawEmbed = embedFromEmbedModel(updatedSetting);
          const placeholders = buildPlaceholders(
            interaction.channel,
            interaction.guild,
            interaction.member,
            interaction.user,
          );
          const embed = replacePlaceholdersAcrossEmbed(rawEmbed, placeholders);
          const resolvedMessage = updatedSetting.messageText
            ? replacePlaceholders(updatedSetting.messageText, placeholders)
            : null;
          const messageSuffix = resolvedMessage ? `\n\n${resolvedMessage}` : '';

          await InteractionUtils.replyEphemeral(i, {
            content: `${Lang.t('commands:embeds.fieldsResetSuccess')}${messageSuffix}`,
            embeds: [embed],
          });

          void Database.AuditLog.util({
            client,
            guild: updatedGuild,
            type: AuditLogType.EMBED_FIELDS_RESET,
            user: interaction.user.id,
            data: {
              before: setting.fields,
              after: [],
            },
          });
        },
      });

      break;
    }

    case EmbedConfigurationConstants.MANAGE_FIELDS_LIST:
    default: {
      if (!setting) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(Lang.t('commands:embeds.fieldsListEmbedMissing')),
        );
        return;
      }

      if (setting.fields.length === 0) {
        await ConfigureEmbedsCommand.reply(
          interaction,
          client.embeds.error(Lang.t('commands:embeds.fieldsListEmpty')),
        );
        return;
      }

      const embed = client.embeds.branding({
        fields: setting.fields.map((e, ind) => ({
          name: `#${ind + 1} | ${e.name}`,
          value: e.value,
          inline: e.inline,
        })),
      });

      await ConfigureEmbedsCommand.reply(interaction, { embeds: [embed] });
      break;
    }
  }
};
