import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { PermLevel } from '@core/commands/permissions';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { EvalConstants } from '../constants';
import { Embeds } from '@core/config/embeds';

const codeModal = new ModalBuilder()
  .setCustomId(EvalConstants.CODE_MODAL_ID)
  .setTitle('Evaluate JavaScript code')
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(EvalConstants.CODE_MODAL_INPUT_ID)
        .setLabel('The JavaScript code to evaluate')
        .setStyle(TextInputStyle.Paragraph),
    ),
  );

const evalControlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId(EvalConstants.ACCEPT_CODE_EVALUATION)
    .setLabel('Accept')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId(EvalConstants.CANCEL_CODE_EVALUATION)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary),
);

const CodeModalCommand = new Command({
  type: CommandType.ModalSubmit,
  data: codeModal,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  interactions: {
    replyEphemeral: true,
  },
  run: async ({ interaction }) => {
    const input = interaction.fields.getTextInputValue(
      EvalConstants.CODE_MODAL_INPUT_ID,
    );
    if (!input || input.length === 0) {
      await CodeModalCommand.reply(
        interaction,
        Embeds.error('No code was provided, please try again'),
      );
      return;
    }

    const embed = Embeds.waiting({
      title: 'Are you sure you want to evaluate this code?',
      description: `\`\`\`js\n${input}\n\`\`\``,
    });

    await CodeModalCommand.reply(interaction, {
      embeds: [embed],
      components: [evalControlRow],
    });
  },
});

export default CodeModalCommand;
