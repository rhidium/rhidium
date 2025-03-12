import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { InteractionConstants, ModalCommand, PermLevel } from '@core';

const CodeModalCommand = new ModalCommand({
  customId: InteractionConstants.EVAL_CODE_MODAL_ID,
  permLevel: PermLevel['Bot Administrator'],
  run: async (client, interaction) => {
    const input = interaction.fields.getTextInputValue(
      InteractionConstants.EVAL_CODE_MODAL_INPUT_ID,
    );
    if (!input || input.length === 0) {
      await CodeModalCommand.reply(
        interaction,
        client.embeds.error('No code was provided, please try again'),
      );
      return;
    }

    const embed = client.embeds.waiting({
      title: 'Are you sure you want to evaluate this code?',
      description: `\`\`\`js\n${input}\n\`\`\``,
    });

    await CodeModalCommand.reply(interaction, {
      embeds: [embed],
      components: [evalControlRow],
    });
  },
});

export const evalControlRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(InteractionConstants.EVAL_ACCEPT_CODE_EVALUATION)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(InteractionConstants.EVAL_CANCEL_CODE_EVALUATION)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );

export default CodeModalCommand;
