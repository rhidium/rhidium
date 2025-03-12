import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
} from 'discord.js';
import {
  Lang,
  ButtonCommand,
  Embeds,
  PermLevel,
  InteractionConstants,
} from '@core';

const EvalDeclineCommand = new ButtonCommand({
  customId: InteractionConstants.EVAL_CANCEL_CODE_EVALUATION,
  permLevel: PermLevel['Bot Administrator'],
  run: async (client, interaction) => {
    await EvalDeclineCommand.reply(
      interaction,
      Lang.t('commands:eval.cancelling'),
    );

    const evalEmbed = interaction.message.embeds[0];
    if (!evalEmbed) {
      await EvalDeclineCommand.reply(
        interaction,
        client.embeds.error(Lang.t('commands:eval.noCodeInOriginMessage')),
      );
      return;
    }

    const embed = EmbedBuilder.from(evalEmbed);
    const inputWithCodeblock = Embeds.extractDescription(embed);
    if (!inputWithCodeblock) {
      await EvalDeclineCommand.reply(
        interaction,
        client.embeds.error(Lang.t('commands:eval.noCodeProvided')),
      );
      return;
    }

    embed.setColor(Colors.Red);
    embed.setTitle(
      `${client.clientEmojis.error} ${Lang.t('commands:eval.cancelledBy', {
        username: interaction.user.username,
      })}}`,
    );
    embed.setDescription(inputWithCodeblock);

    await interaction.message
      .edit({
        embeds: [embed],
        components: [evalDeclinedRow],
      })
      .catch(() => null);
    await EvalDeclineCommand.reply(
      interaction,
      Lang.t('commands:eval.cancelled'),
    );
  },
});

export default EvalDeclineCommand;

export const evalDeclinedRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(InteractionConstants.EVAL_CANCEL_CODE_EVALUATION)
      .setLabel(Lang.t('general:cancelled'))
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary),
  );
