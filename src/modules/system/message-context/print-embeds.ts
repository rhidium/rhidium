import { Command, CommandType } from '@core/commands';
import { Embeds } from '@core/config';
import { EmbedConstants } from '@core/constants';
import { AttachmentBuilder, EmbedBuilder, escapeCodeBlock } from 'discord.js';

const PrintEmbedsCommand = new Command({
  type: CommandType.MessageContextMenu,
  data: (builder) => builder.setName('Print Embed Data'),
  category: 'Testing & Development',
  run: async (client, interaction) => {
    const { targetMessage } = interaction;
    const hasEmbeds = targetMessage.embeds.length > 0;

    if (!hasEmbeds) {
      // Might be missing MessageContent scope
      await PrintEmbedsCommand.reply(
        interaction,
        Embeds.error(client.Lang.t('core:discord.messageHasNoEmbeds')),
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
          Embeds.primary({
            description: `\`\`\`json\n${output}\n\`\`\``,
          }),
        );
    }

    await PrintEmbedsCommand.reply(interaction, context);
  },
});

export default PrintEmbedsCommand;
