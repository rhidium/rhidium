import {
  AttachmentBuilder,
  EmbedBuilder,
  InteractionReplyOptions,
  escapeCodeBlock,
} from 'discord.js';
import { EmbedConstants, MessageContextCommand } from '@rhidium/core';
import { Lang } from 'lib/i18n';

const PrintEmbedCommand = new MessageContextCommand({
  run: async (client, interaction) => {
    const { targetMessage } = interaction;
    const hasEmbeds = targetMessage.embeds.length > 0;

    if (!hasEmbeds) {
      // Might be missing MessageContent scope
      await PrintEmbedCommand.reply(
        interaction,
        client.embeds.error(Lang.t('commands:print-embed.noEmbeds')),
      );
      return;
    }

    const { embeds } = targetMessage;
    const codeblockFormattingLength = 10;
    const context: Omit<InteractionReplyOptions, 'embeds'> & {
      files: AttachmentBuilder[];
      embeds: EmbedBuilder[];
    } = {
      embeds: [],
      files: [],
    };

    for (const embed of embeds) {
      const output = escapeCodeBlock(JSON.stringify(embed, null, 2));
      const outputLength = output.length;
      if (
        outputLength >
        EmbedConstants.DESCRIPTION_MAX_LENGTH - codeblockFormattingLength
      ) {
        context.files.push(
          new AttachmentBuilder(Buffer.from(output))
            .setName('embed.json')
            .setSpoiler(true),
        );
      } else
        context.embeds.push(
          client.embeds.branding({
            description: `\`\`\`json\n${output}\n\`\`\``,
          }),
        );
    }

    await PrintEmbedCommand.reply(interaction, context);
  },
});

export default PrintEmbedCommand;
