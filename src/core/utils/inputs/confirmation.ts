import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  Interaction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  RepliableInteraction,
} from 'discord.js';
import { appConfig } from '@core/config';
import { I18n } from '@core/i18n';
import { UnitConstants } from '@core/constants';
import { InteractionUtils } from '../interaction';

type PromptConfirmationOptions<I extends RepliableInteraction> = {
  interaction: I;
  ephemeral?: boolean;
  content?: InteractionReplyOptions & InteractionEditReplyOptions;
  onConfirm?: (interaction: ButtonInteraction) => void | Promise<void>;
  onCancel?: (interaction: ButtonInteraction) => void | Promise<void>;
};

class ConfirmationInput {
  static readonly BUTTON_CONFIRM_ID = '@confirmation-confirm';
  static readonly BUTTON_CANCEL_ID = '@confirmation-cancel';

  /**
   * Get the confirmation button row for prompts
   * @param client The client instance
   * @returns The confirmation button row
   */
  static readonly buttonRow = (interaction: Interaction) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(this.BUTTON_CONFIRM_ID)
        .setLabel(I18n.localize('common:actions.confirm', interaction))
        .setEmoji(appConfig.emojis.success)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(this.BUTTON_CANCEL_ID)
        .setLabel(I18n.localize('common:actions.cancel', interaction))
        .setEmoji(appConfig.emojis.error)
        .setStyle(ButtonStyle.Secondary),
    );

  /**
   * Prompt a user for confirmation with a button row
   * @param options The options for the prompt
   * @returns The interaction, false if cancelled, or 'expired'
   */
  static readonly promptConfirmation = async <I extends RepliableInteraction>(
    options: PromptConfirmationOptions<I>,
  ): Promise<RepliableInteraction | false | 'expired'> => {
    let { content } = options;
    const { interaction, ephemeral = false, onConfirm, onCancel } = options;

    if (!content) content = {};
    if (!content.components) content.components = [];
    if (!content.embeds) content.embeds = [];
    if (!content.files) content.files = [];

    const confirmationRow = this.buttonRow(interaction);
    const components = content.components.length
      ? [...content.components, confirmationRow]
      : [confirmationRow];

    const ctx = {
      content: I18n.localize('common:confirmation.prompt.message', interaction),
      ...content,
      components,
    };

    const message = await InteractionUtils.replyDynamic(
      interaction,
      ctx,
      ephemeral,
      false,
    );

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: UnitConstants.MS_IN_ONE_MINUTE,
    });

    return await new Promise<RepliableInteraction | false | 'expired'>(
      (resolve) => {
        collector.on('collect', async (button) => {
          if (button.user.id !== interaction.user.id) {
            void InteractionUtils.replyDynamic(interaction, {
              content: I18n.localize('core:commands.notTargetUser', button),
            });
            return;
          }

          if (button.customId === this.BUTTON_CONFIRM_ID) {
            resolve(button);
            if (onConfirm) {
              await onConfirm(button);
            } else {
              await button.update({
                content: I18n.localize(
                  'common:confirmation.confirm.message',
                  button,
                ),
                components: [],
              });
            }
          }

          if (button.customId === this.BUTTON_CANCEL_ID) {
            resolve(false);
            if (onCancel) {
              await onCancel(button);
            } else {
              await button.update({
                content: I18n.localize(
                  'common:confirmation.cancel.message',
                  button,
                ),
                components: [],
              });
            }
          }
        });

        collector.on('end', async (collected) => {
          if (collected.size) return;
          resolve('expired');
        });
      },
    );
  };
}

export { ConfirmationInput, type PromptConfirmationOptions };
