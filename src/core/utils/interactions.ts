// [DEV] This file could really use a major refactor. Add examples, `confirmation` wrapper, etc.

import {
  APIActionRowComponent,
  APIActionRowComponentTypes,
  APIMessageActionRowComponent,
  ActionRowBuilder,
  ActionRowComponentData,
  ActionRowData,
  AnyComponentBuilder,
  BaseMessageOptions,
  BaseSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ComponentType,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionType,
  JSONEncodable,
  MentionableSelectMenuBuilder,
  MessageFlags,
  BaseInteraction,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  UserSelectMenuBuilder,
  RepliableInteraction,
} from 'discord.js';
import { UnitConstants } from '../constants';
import { Client } from '../client';
import { AvailableGuildInteraction } from '../commands/controllers'; // [DEV] Looks like scope should be moved

const isAcknowledged = <T extends BaseInteraction>(interaction: T) =>
  interaction.isRepliable() && (interaction.replied || interaction.deferred);

const replyEphemeral = <I extends BaseInteraction>(
  interaction: I,
  content:
    | string
    | (Omit<InteractionReplyOptions & InteractionEditReplyOptions, 'flags'> &
        InteractionReplyDynamicOptions),
) => {
  if (!interaction.isRepliable()) return;

  if (InteractionUtils.isAcknowledged(interaction)) {
    if (typeof content !== 'string' && content.preferFollowUp) {
      if (interaction.type === InteractionType.MessageComponent) {
        return interaction.update(content);
      }

      return interaction.followUp(content);
    }

    return interaction.editReply(content);
  }

  return interaction.reply({
    ...(typeof content === 'string' ? { content } : content),
    flags: [MessageFlags.Ephemeral],
  });
};

const resolveRowsFromComponents = (
  components: (AnyComponentBuilder | null)[],
): (
  | ButtonBuilder
  | ChannelSelectMenuBuilder
  | MentionableSelectMenuBuilder
  | RoleSelectMenuBuilder
  | StringSelectMenuBuilder
  | UserSelectMenuBuilder
  | TextInputBuilder
  | null
)[][] => {
  const rows = [];
  let currentRow = [];
  for (const component of components) {
    if (currentRow.length === 5 || component === null) {
      rows.push(currentRow);
      currentRow = [];
    }
    currentRow.push(component);
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
};

const channelTypeToString = (type: ChannelType): string => {
  switch (type) {
    case ChannelType.GuildText:
      return 'Text';
    case ChannelType.GuildVoice:
      return 'Voice';
    case ChannelType.GuildCategory:
      return 'Category';
    case ChannelType.GuildStageVoice:
      return 'Stage';
    case ChannelType.PublicThread:
      return 'Public Thread';
    case ChannelType.PrivateThread:
      return 'Private Thread';
    case ChannelType.GuildAnnouncement:
      return 'Announcement';
    case ChannelType.AnnouncementThread:
      return 'Announcement Thread';
    case ChannelType.DM:
      return 'DM';
    case ChannelType.GroupDM:
      return 'Group DM';
    case ChannelType.GuildForum:
      return 'Guild Forum';
    case ChannelType.GuildDirectory:
      return 'Guild Directory';
    default:
      return 'Unknown';
  }
};

const requireAvailableGuild = <I extends BaseInteraction>(
  client: Client,
  interaction: I,
): interaction is AvailableGuildInteraction<I> => {
  if (!interaction.inGuild()) {
    void InteractionUtils.replyEphemeral(interaction, {
      content: client.I18N.t('core:commands.notAvailableInDMs'),
    });
    return false;
  }

  if (!interaction.inCachedGuild()) {
    void InteractionUtils.replyEphemeral(interaction, {
      content: client.I18N.t('core:commands.missingCachedServer'),
    });
    return false;
  }

  if (!interaction.guild.available) {
    void InteractionUtils.replyEphemeral(interaction, {
      content: client.I18N.t('core:commands.serverUnavailable'),
    });
    return false;
  }

  return true;
};

const paginator = async (
  id: string,
  client: Client,
  pages: BaseMessageOptions[],
  interaction: RepliableInteraction,
  duration = UnitConstants.MS_IN_ONE_HOUR,
  options?: InteractionReplyDynamicOptions & {
    ephemeral?: boolean;
  },
) => {
  const goToFirstId = `@pagination:${id}:first`;
  const goToPreviousId = `@pagination:${id}:previous`;
  const goToNextId = `@pagination:${id}:next`;
  const goToLastId = `@pagination:${id}:last`;
  const paginationIds = [goToFirstId, goToPreviousId, goToNextId, goToLastId];

  let pageNow = 0;
  const isOnFirstPage = () => pageNow === 0;
  const isOnLastPage = () => pageNow === pages.length - 1;
  const controlRow = (forceDisable = false) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(goToFirstId)
        .setDisabled(forceDisable || isOnFirstPage())
        .setLabel('First')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(goToPreviousId)
        .setDisabled(forceDisable || isOnFirstPage())
        .setLabel('Previous')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(goToNextId)
        .setDisabled(forceDisable || isOnLastPage())
        .setLabel('Next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(goToLastId)
        .setDisabled(forceDisable || isOnLastPage())
        .setLabel('Last')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Primary),
    );

  const paginator = async (page: number) => {
    const content = pages[page];
    if (!content) return;
    await interaction.editReply({
      ...content,
      components: [controlRow()],
      ...options,
    });
  };

  if (!InteractionUtils.isAcknowledged(interaction)) {
    await interaction.deferReply({
      flags: options?.ephemeral ? [MessageFlags.Ephemeral] : undefined,
    });
  }

  const initialReply = await interaction.editReply({
    ...pages[0],
    components: [controlRow()],
    ...options,
  });

  if (!initialReply) {
    void InteractionUtils.replyEphemeral(interaction, {
      content: client.I18N.t('core:commands.missingInitialReply'),
      ...options,
    });
    return;
  }

  const collector = initialReply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: duration,
    filter: (i) => paginationIds.includes(i.customId),
  });

  collector.on('collect', async (button) => {
    if (button.user.id !== interaction.user.id) {
      void InteractionUtils.replyEphemeral(interaction, {
        content: client.I18N.t('core:commands.isNotComponentUser'),
        ...options,
      });
      return;
    }

    await button.deferUpdate();

    if (button.customId === goToFirstId) {
      pageNow = 0;
      await paginator(pageNow);
    }

    if (button.customId === goToPreviousId) {
      if (pageNow === 0) pageNow = pages.length - 1;
      else pageNow--;
      await paginator(pageNow);
    }

    if (button.customId === goToNextId) {
      if (pageNow === pages.length - 1) pageNow = 0;
      else pageNow++;
      await paginator(pageNow);
    }

    if (button.customId === goToLastId) {
      pageNow = pages.length - 1;
      await paginator(pageNow);
    }
  });

  collector.on('end', async () => {
    await initialReply.edit({
      components: [controlRow(true)],
    });
  });
};

const disableComponents = (
  components: (
    | AnyComponentBuilder
    | APIActionRowComponent<APIMessageActionRowComponent>
    | JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
    | ActionRowData<
        JSONEncodable<APIActionRowComponentTypes> | ActionRowComponentData
      >
  )[],
) =>
  components.map((component) => {
    if (component instanceof ActionRowBuilder) {
      for (const innerComponent of component.components) {
        if (
          innerComponent instanceof ButtonBuilder ||
          innerComponent instanceof BaseSelectMenuBuilder
        )
          innerComponent.setDisabled(true);
      }
    }
    return component;
  });

interface InteractionReplyDynamicOptions {
  /**
   * Whether to prefer follow-up messages over other types of replies.
   * If set to true, and the interaction is a message component interaction,
   * the interaction will be updated instead of replied to.
   */
  preferFollowUp?: boolean;
}

class InteractionUtils {
  /**
   * Check if an interaction has been acknowledged
   * @param interaction The interaction to check
   * @returns Whether the interaction has been acknowledged
   */
  static readonly isAcknowledged = isAcknowledged;
  /**
   * (try to) Reply to an interaction with an ephemeral message
   * @param interaction The interaction to reply to
   * @param content The content to reply with
   */
  static readonly replyEphemeral = replyEphemeral;
  /**
   * Resolves the (discord.js) rows from an array of components
   * @param components The components to resolve rows from
   * @returns The resolved rows
   */
  static readonly resolveRowsFromComponents = resolveRowsFromComponents;
  /**
   * Convert a channel type to a human-readable string
   * @param type The channel type to convert
   * @returns The human-readable string
   */
  static readonly channelTypeToString = channelTypeToString;
  /**
   * Require that an interaction is in an available/cached guild
   * @param client The client instance
   * @param interaction The interaction to check
   * @returns Whether the interaction is in an available guild
   */
  static readonly requireAvailableGuild = requireAvailableGuild;
  /**
   * Create a paginator for an interaction
   * @param id The paginator ID
   * @param client The client instance
   * @param pages The pages to paginate
   * @param interaction The interaction to paginate for
   * @param duration The duration the paginator should last
   * @param options The options to pass to the interaction reply
   */
  static readonly paginator = paginator;
  /**
   * Disable all components in a given array
   * @param components The components to disable
   * @returns The disabled components
   */
  static readonly disableComponents = disableComponents;
}

export { InteractionUtils, type InteractionReplyDynamicOptions };
