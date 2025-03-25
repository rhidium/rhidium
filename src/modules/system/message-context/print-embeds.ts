import {
  AttachmentBuilder,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  escapeCodeBlock,
} from 'discord.js';
import { Lang, EmbedConstants, MessageContextCommand } from '@core';

const PrintEmbedCommand = new MessageContextCommand({
  data: new ContextMenuCommandBuilder().setName('Print Embed Data'),
  disabled: false,
  category: 'Developer',
  guildOnly: false,
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
    const context = {
      embeds: [],
      files: [],
    } as {
      embeds: EmbedBuilder[];
      files: AttachmentBuilder[];
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
