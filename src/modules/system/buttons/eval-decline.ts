import { Command, CommandType, PermLevel } from '@core/commands';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Interaction,
} from 'discord.js';
import { EvalConstants } from '../constants';
import { appConfig, Embeds } from '@core/config';
import { I18n } from '@core/i18n';

const evalDeclinedRow = (interaction: Interaction) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(EvalConstants.CANCEL_CODE_EVALUATION)
      .setLabel(I18n.localize('common:word.cancelled', interaction))
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary),
  );

const EvalDeclineCommand = new Command({
  type: CommandType.Button,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  interactions: {
    replyEphemeral: true,
  },
  data: (builder) =>
    builder
      .setLabel('Cancel')
      .setEmoji(appConfig.emojis.error)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(false)
      .setCustomId(EvalConstants.CANCEL_CODE_EVALUATION),
  run: async ({ interaction }) => {
    const evalEmbed = interaction.message.embeds[0];
    if (!evalEmbed) {
      await EvalDeclineCommand.reply(interaction, {
        preferUpdate: true,
        content: '',
        components: [],
        embeds: [
          Embeds.error(I18n.localize('commands:eval.noEmbed', interaction)),
        ],
      });
      return;
    }

    await EvalDeclineCommand.reply(interaction, {
      preferUpdate: true,
      content: '',
      components: [evalDeclinedRow(interaction)],
      embeds: [
        Embeds.secondary({
          ...evalEmbed.data,
          title: `${I18n.localize('common:word.cancelled', interaction, {
            username: interaction.user.username,
          })}`,
        }),
      ],
    });
  },
});

export default EvalDeclineCommand;
