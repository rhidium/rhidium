import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  InteractionReplyOptions,
  RepliableInteraction,
  SlashCommandBooleanOption,
} from 'discord.js';
import { Client } from '../../client';
import {
  InteractionReplyDynamicOptions,
  InteractionUtils,
} from '../interactions';
import { UnitConstants } from '../../constants';

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

class ConfirmationInput {
  static readonly BUTTON_CONFIRM_ID = '@confirmation-confirm';
  static readonly BUTTON_CANCEL_ID = '@confirmation-cancel';

  /**
   * The name of the confirmation option for slash commands
   */
  static readonly chatInputOptionName = 'confirmation';

  /**
   * Add a confirmation option to a slash command
   * @param i The boolean option to add the confirmation option to
   * @returns The boolean option with the confirmation option
   */
  static readonly addChatInputOption = (i: SlashCommandBooleanOption) =>
    i
      .setName(this.chatInputOptionName)
      .setDescription('Are you sure you want to perform this action?')
      .setRequired(false);

  /**
   * Handle the confirmation option interaction for slash commands
   * @param client The client instance
   * @param interaction The interaction to check
   * @returns Whether the interaction has the confirmation option
   */
  static readonly chatInputOptionHandler = (
    client: Client,
    interaction: ChatInputCommandInteraction,
  ): boolean => {
    const value = interaction.options.getBoolean(this.chatInputOptionName);
    if (!value) {
      void InteractionUtils.replyEphemeral(interaction, {
        content: client.I18N.t('core:commands.confirmationRequired'),
      });
      return false;
    }
    return true;
  };

  /**
   * Get the confirmation button row for prompts
   * @param client The client instance
   * @returns The confirmation button row
   */
  static readonly buttonRow = (client: Client) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(this.BUTTON_CONFIRM_ID)
        .setLabel(client.I18N.t('core:commands.confirmationButtonLabel'))
        .setEmoji(client.clientEmojis.success)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(this.BUTTON_CANCEL_ID)
        .setLabel(client.I18N.t('core:commands.cancelButtonLabel'))
        .setEmoji(client.clientEmojis.error)
        .setStyle(ButtonStyle.Secondary),
    );

  /**
   * Prompt a user for confirmation with a button row
   * @param options The options for the prompt
   * @returns The interaction, false if cancelled, or 'expired'
   */
  static readonly promptConfirmation = async (
    _options: PromptConfirmationOptions,
  ): Promise<RepliableInteraction | false | 'expired'> => {
    let { content } = _options;
    const {
      client,
      interaction,
      options,
      onConfirm,
      onCancel,
      shouldReplyOnConfirm = false,
      shouldReplyOnCancel = true,
      removeComponents = true,
      disableComponents = true,
      removeEmbeds = true,
      removeFiles = true,
    } = _options;

    if (!content) content = {};
    if (!content.components) content.components = [];
    if (!content.embeds) content.embeds = [];
    if (!content.files) content.files = [];

    const newEmbeds = removeEmbeds ? [] : content.embeds;
    const newFiles = removeFiles ? [] : content.files;
    const confirmationRow = this.buttonRow(client);
    const components = content.components.length
      ? [...content.components, confirmationRow]
      : [confirmationRow];

    const message = await InteractionUtils.replyEphemeral(interaction, {
      content: client.I18N.t('core:commands.promptConfirmation'),
      ...content,
      ...options,
      components,
      withResponse: true,
    });

    if (!message) {
      void InteractionUtils.replyEphemeral(interaction, {
        content: client.I18N.t('core:commands.missingInitialReply'),
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
            void InteractionUtils.replyEphemeral(interaction, {
              content: client.I18N.t('core:commands.isNotComponentUser'),
            });
            return;
          }

          if (button.customId === this.BUTTON_CONFIRM_ID) {
            if (shouldReplyOnConfirm) await button.deferUpdate();
            if (typeof onConfirm === 'function') await onConfirm(button);
            if (disableComponents)
              InteractionUtils.disableComponents(components);
            if (shouldReplyOnConfirm)
              await InteractionUtils.replyEphemeral(button, {
                content: client.I18N.t('core:commands.confirmationAccepted'),
                embeds: newEmbeds,
                files: newFiles,
                components: removeComponents ? [] : components,
              });
            resolve(button);
          }

          if (button.customId === this.BUTTON_CANCEL_ID) {
            if (shouldReplyOnCancel) await button.deferUpdate();
            if (typeof onCancel === 'function') await onCancel(button);
            if (disableComponents)
              InteractionUtils.disableComponents(components);
            if (shouldReplyOnCancel)
              await InteractionUtils.replyEphemeral(button, {
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
          await InteractionUtils.replyEphemeral(interaction, {
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
}

export { ConfirmationInput, type PromptConfirmationOptions };
