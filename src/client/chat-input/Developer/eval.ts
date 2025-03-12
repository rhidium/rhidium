import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { ChatInputCommand, PermLevel } from '@core';
import EvalConstants from '../../enums/eval';

const EvalCommand = new ChatInputCommand({
  permLevel: PermLevel['Bot Administrator'],
  data: new SlashCommandBuilder().setDescription(
    'Evaluate arbitrary JavaScript code',
  ),
  run: async (_client, interaction) => {
    await interaction.showModal(codeModal);
  },
});

export const codeModal = new ModalBuilder()
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

export default EvalCommand;
