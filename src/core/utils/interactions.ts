// [DEV] This file could really use a major refactor. Add examples, `confirmation` wrapper, etc.

import {
  APIActionRowComponent,
  APIActionRowComponentTypes,
  APIMessageActionRowComponent,
  ActionRowBuilder,
  ActionRowComponentData,
  ActionRowData,
  AnyComponentBuilder,
  BaseInteraction,
  BaseMessageOptions,
  BaseSelectMenuBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  DiscordAPIError,
  DiscordjsError,
  InteractionReplyOptions,
  JSONEncodable,
  MentionableSelectMenuBuilder,
  MessageFlags,
  RepliableInteraction,
  RoleSelectMenuBuilder,
  SlashCommandBooleanOption,
  StringSelectMenuBuilder,
  TextInputBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import {
  DiscordConstants,
  InteractionConstants,
  UnitConstants,
} from '../constants';
import { Client } from '../client';
import { AvailableGuildInteraction } from '../commands/controllers'; // [DEV] Looks like scope should be moved

const replyFn = <I extends BaseInteraction>(
  client: Client,
  interaction: I,
  options?: InteractionReplyDynamicOptions,
) => {
  const { logger } = client;
  if (!interaction.isRepliable()) {
    const noop = async (content: InteractionReplyOptions) =>
      new Promise<null>(() => {
        logger.warn(
          `Interaction ${interaction.id} is not repliable, and cannot be replied to - returning no-operation`,
        );
        logger.warn(
          'This is very likely a bug in your code, and you should analyze the content below to determine the issue:',
        );
        logger.startLog('Non-repliable Interaction Content');
        console.table(content);
        logger.endLog('Non-repliable Interaction Content');
      });
    return noop;
  }

  // Bind interaction to applicable reply function
  if (options?.preferFollowUp) return interaction.followUp.bind(interaction);
  else if (interaction.replied || interaction.deferred)
    return interaction.editReply.bind(interaction);
  else {
    // Fail-safe - no reply after DiscordConstants.MS_UNTIL_INTERACTION_EXPIRES
    // but interaction wasn't deferred or replied to
    if (
      interaction.createdTimestamp <
      Date.now().valueOf() - DiscordConstants.MS_UNTIL_INTERACTION_EXPIRES
    ) {
      return async (content: InteractionReplyOptions) =>
        new Promise<null>(() => {
          logger.error(
            `Interaction ${interaction.id} was not replied to, and has expired - returning no-operation`,
          );
          logger.warn(
            'This is very likely a bug in your code, and you should analyze the content below to determine the issue:',
          );
          logger.startLog('Expired Interaction Content');
          console.table(content);
          logger.endLog('Expired Interaction Content');
        });
    }
    return interaction.reply.bind(interaction);
  }
};

const replyDynamic = async <I extends BaseInteraction>(
  client: Client,
  interaction: I,
  content: InteractionReplyOptions,
  options?: InteractionReplyDynamicOptions,
) => {
  const { logger } = client;
  const logReplyErr = (err: unknown, ctx: InteractionReplyOptions) => {
    const msg =
      err instanceof DiscordjsError || err instanceof DiscordAPIError
        ? err.message
        : `${err}`;
    logger.error(`Failed to reply to interaction ${interaction.id} - ${msg}`);
    logger.warn(
      'Above error encountered while attempting to reply to interaction with following content:',
    );
    logger.startLog('Interaction Content');
    console.dir(ctx, { depth: Infinity });
    logger.endLog('Interaction Content');
  };

  try {
    return await InteractionUtils.replyFn(
      client,
      interaction,
      options,
      // @ts-expect-error - Bind returns the type of any overload
    )(content);
  } catch (err) {
    logReplyErr(err, content);
    const errCtx = {
      content: client.I18N.t('core:commands.errorWhileReplyingToInteraction'),
      flags: [MessageFlags.Ephemeral] as const,
    };
    await InteractionUtils.replyFn(
      client,
      interaction,
      options,
      // @ts-expect-error - Bind returns the type of any overload
    )(errCtx).catch((err: unknown) => {
      logReplyErr(err, errCtx);
    });
    return null;
  }
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

const requireGuild = <I extends BaseInteraction>(
  client: Client,
  interaction: BaseInteraction,
): interaction is AvailableGuildInteraction<I> => {
  if (!interaction.inGuild()) {
    void InteractionUtils.replyDynamic(client, interaction, {
      content: client.I18N.t('core:commands.notAvailableInDMs'),
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  if (!interaction.inCachedGuild()) {
    void InteractionUtils.replyDynamic(client, interaction, {
      content: client.I18N.t('core:commands.missingCachedServer'),
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  return true;
};

const requireAvailableGuild = <I extends BaseInteraction>(
  client: Client,
  interaction: I,
): interaction is AvailableGuildInteraction<I> => {
  if (!InteractionUtils.requireGuild(client, interaction)) return false;
  if (!interaction.guild.available) {
    void InteractionUtils.replyDynamic(client, interaction, {
      content: client.I18N.t('core:commands.serverUnavailable'),
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  interaction.channel;
  interaction.member;
  interaction.guild;
  interaction.guildId;
  interaction.guildLocale;

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

  if (!interaction.replied) {
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
    void InteractionUtils.replyDynamic(client, interaction, {
      content: client.I18N.t('core:commands.missingInitialReply'),
      flags: [MessageFlags.Ephemeral],
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
      void InteractionUtils.replyDynamic(client, interaction, {
        content: client.I18N.t('core:commands.isNotUserPaginator'),
        flags: [MessageFlags.Ephemeral],
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

const slashConfirmationOptionName = 'confirmation';
const addSlashConfirmationOption = (i: SlashCommandBooleanOption) =>
  i
    .setName(slashConfirmationOptionName)
    .setDescription('Are you sure you want to perform this action?')
    .setRequired(false);

const slashConfirmationOptionHandler = (
  client: Client,
  interaction: ChatInputCommandInteraction,
): boolean => {
  const value = interaction.options.getBoolean(slashConfirmationOptionName);
  if (!value) {
    void InteractionUtils.replyDynamic(client, interaction, {
      content: client.I18N.t('core:commands.confirmationRequired'),
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }
  return true;
};

const confirmationButtonRow = (client: Client) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(InteractionConstants.CONFIRMATION_BUTTON_CONFIRM_ID)
      .setLabel(client.I18N.t('core:commands.confirmationButtonLabel'))
      .setEmoji(client.clientEmojis.success)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(InteractionConstants.CONFIRMATION_BUTTON_CANCEL_ID)
      .setLabel(client.I18N.t('core:commands.cancelButtonLabel'))
      .setEmoji(client.clientEmojis.error)
      .setStyle(ButtonStyle.Secondary),
  );

const promptConfirmation = async ({
  client,
  interaction,
  content,
  options,
  onConfirm,
  onCancel,
  shouldReplyOnConfirm = false,
  shouldReplyOnCancel = true,
  removeComponents = true,
  disableComponents = true,
  removeEmbeds = true,
  removeFiles = true,
}: PromptConfirmationOptions): Promise<
  RepliableInteraction | false | 'expired'
> => {
  if (!content) content = {};
  if (!content.components) content.components = [];
  if (!content.embeds) content.embeds = [];
  if (!content.files) content.files = [];

  const newEmbeds = removeEmbeds ? [] : content.embeds;
  const newFiles = removeFiles ? [] : content.files;
  const confirmationRow = confirmationButtonRow(client);
  const components = content.components.length
    ? [...content.components, confirmationRow]
    : [confirmationRow];

  const message = await InteractionUtils.replyDynamic(client, interaction, {
    content: client.I18N.t('core:commands.promptConfirmation'),
    ...content,
    ...options,
    components,
    withResponse: true,
  });

  if (!message) {
    void InteractionUtils.replyDynamic(client, interaction, {
      content: client.I18N.t('core:commands.missingInitialReply'),
      flags: [MessageFlags.Ephemeral],
    });
    return false;
  }

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: UnitConstants.MS_IN_ONE_MINUTE,
  });

  return await new Promise<RepliableInteraction | false | 'expired'>(
    (resolve) => {
      collector.on('collect', async (button) => {
        if (button.user.id !== interaction.user.id) {
          void InteractionUtils.replyDynamic(client, interaction, {
            content: client.I18N.t('core:commands.isNotComponentUser'),
            flags: [MessageFlags.Ephemeral],
          });
          return;
        }

        if (
          button.customId ===
          InteractionConstants.CONFIRMATION_BUTTON_CONFIRM_ID
        ) {
          if (shouldReplyOnConfirm) await button.deferUpdate();
          if (typeof onConfirm === 'function') await onConfirm(button);
          if (disableComponents) InteractionUtils.disableComponents(components);
          if (shouldReplyOnConfirm)
            await InteractionUtils.replyDynamic(client, button, {
              content: client.I18N.t('core:commands.confirmationAccepted'),
              embeds: newEmbeds,
              files: newFiles,
              components: removeComponents ? [] : components,
            });
          resolve(button);
        }

        if (
          button.customId === InteractionConstants.CONFIRMATION_BUTTON_CANCEL_ID
        ) {
          if (shouldReplyOnCancel) await button.deferUpdate();
          if (typeof onCancel === 'function') await onCancel(button);
          if (disableComponents) InteractionUtils.disableComponents(components);
          if (shouldReplyOnCancel)
            await InteractionUtils.replyDynamic(client, button, {
              content: client.I18N.t('core:commands.confirmationCancelled'),
              embeds: newEmbeds,
              files: newFiles,
              components: removeComponents ? [] : components,
            });
          resolve(false);
        }
      });

      collector.on('end', async (collected) => {
        if (collected.size) return;
        InteractionUtils.disableComponents(components);
        await InteractionUtils.replyDynamic(client, interaction, {
          content: client.I18N.t('core:commands.confirmationExpired'),
          embeds: newEmbeds,
          files: newFiles,
          components: components,
        });
        resolve('expired');
      });
    },
  );
};

interface InteractionReplyDynamicOptions {
  preferFollowUp?: boolean;
}

type PromptConfirmationOptions = {
  client: Client;
  interaction: RepliableInteraction;
  content?: InteractionReplyOptions;
  options?: InteractionReplyDynamicOptions;
  onConfirm?: (interaction: ButtonInteraction) => void | Promise<void>;
  onCancel?: (interaction: ButtonInteraction) => void | Promise<void>;
  shouldReplyOnConfirm?: boolean;
  shouldReplyOnCancel?: boolean;
  removeComponents?: boolean;
  disableComponents?: boolean;
  removeEmbeds?: boolean;
  removeFiles?: boolean;
};

class InteractionUtils {
  /**
   * Resolves the applicable reply function for the given interaction
   *
   * Note: This is function should never be assigned to a variable, as it's purpose is
   * dynamically resolving the reply function for the given interaction. If you
   * assign this to a variable, it will always resolve to the same function.
   *
   * Example:
   * ```ts
   * InteractionUtils.replyFn(interaction)(content);
   * ```
   * @param client The client instance
   * @param interaction The interaction to resolve the reply function for
   * @param options The options to pass to the reply function
   * @returns The applicable reply function for the given interaction and options
   */
  static readonly replyFn = replyFn;
  /**
   * Reply to an interaction - dynamically resolves the reply function,
   * and calls it with the given content, util to avoid having to
   * directly invoke the replyFn method, as explained in it's declaration
   *
   * Note: It definitely needs the client, as it needs to be able to
   * log critical errors if they are encountered while replying
   * to interactions - it's worth all the client not null checks
   *
   * @param client The client instance
   * @param interaction The interaction to reply to
   * @param content The content to reply with
   * @param options The options to pass to the reply function
   * @returns Reply method return value - use `withResponse` if appropriate
   */
  static readonly replyDynamic = replyDynamic;
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
   * Require that an interaction is in a guild
   * @param client The client instance
   * @param interaction The interaction to check
   * @returns Whether the interaction is in a guild
   */
  static readonly requireGuild = requireGuild;
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
  /**
   * The name of the confirmation option for slash commands
   */
  static readonly slashConfirmationOptionName = slashConfirmationOptionName;
  /**
   * Add a confirmation option to a slash command
   * @param i The boolean option to add the confirmation option to
   * @returns The boolean option with the confirmation option
   */
  static readonly addSlashConfirmationOption = addSlashConfirmationOption;
  /**
   * Handle the confirmation option interaction for slash commands
   * @param client The client instance
   * @param interaction The interaction to check
   * @returns Whether the interaction has the confirmation option
   */
  static readonly slashConfirmationOptionHandler =
    slashConfirmationOptionHandler;
  /**
   * Get the confirmation button row for prompts
   * @param client The client instance
   * @returns The confirmation button row
   */
  static readonly confirmationButtonRow = confirmationButtonRow;
  /**
   * Prompt a user for confirmation with a button row
   * @param options The options for the prompt
   * @returns The interaction, false if cancelled, or 'expired'
   */
  static readonly promptConfirmation = promptConfirmation;
}

export {
  InteractionUtils,
  type InteractionReplyDynamicOptions,
  type PromptConfirmationOptions,
};
