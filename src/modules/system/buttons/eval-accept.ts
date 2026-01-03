import { inspect } from 'util';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Interaction,
} from 'discord.js';
import { Command, CommandType, PermLevel } from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { EvalConstants } from '../constants';
import { I18n } from '@core/i18n';
import { TimeUtils } from '@core/utils';
import { EmbedConstants } from '@core/constants';
import Client from '@core/client';

const evalAcceptedRow = (interaction: Interaction) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(EvalConstants.ACCEPT_CODE_EVALUATION)
      .setLabel(I18n.localize('commands:eval.evaluated.label', interaction))
      .setDisabled(true)
      .setStyle(ButtonStyle.Success),
  );

const evaluateCode = async (
  code: string,
  context: {
    client: Client<true>;
    interaction: Interaction;
  },
) => {
  let evaluated: unknown;
  const { client, interaction } = context;
  const startEval = process.hrtime.bigint();

  try {
    const asyncWrapper = `(async ({ client, interaction }) => { ${code} })`;
    const fn = (0, eval)(asyncWrapper); // "Safe" indirect eval
    evaluated = await fn({ client, interaction });
  } catch (err) {
    const errorEmbed = Embeds.error({
      title: I18n.localize('commands:eval.evaluated.error.title', interaction),
      description:
        I18n.localize(
          'commands:eval.evaluated.error.description',
          interaction,
        ) + `\`\`\`${err}\`\`\``,
    });
    return {
      error: true,
      embeds: [errorEmbed],
    };
  }

  // Safe inspect with limited depth
  const output = inspect(evaluated, {
    depth: null,
    showHidden: false,
  });

  const runtime = TimeUtils.bigIntDurationToHumanReadable(startEval);
  const embed = Embeds.success({
    title: I18n.localize('common:word.success', interaction),
    fields: [
      {
        name: `:inbox_tray: ${I18n.localize('commands:eval.evaluated.input.title', interaction)}`,
        value: `\`\`\`js\n${code}\n\`\`\``,
        inline: false,
      },
    ],
  });

  const files: AttachmentBuilder[] = [];

  if (output.length > EmbedConstants.FIELD_VALUE_MAX_LENGTH - 6) {
    files.push(
      new AttachmentBuilder(Buffer.from(output.toString(), 'utf-8'), {
        name: `${I18n.localize('commands:eval.evaluated.output.title', interaction)}.txt`,
      }),
    );
  } else {
    embed.addFields({
      name: `:outbox_tray: ${I18n.localize('commands:eval.evaluated.output.title', interaction)}`,
      value: `\`\`\`\n${output}\n\`\`\``,
      inline: false,
    });
  }

  embed.addFields({
    name: `:stopwatch: ${I18n.localize('common:time.runtime', interaction)}`,
    value: `\`\`\`${runtime}\`\`\``,
    inline: false,
  });

  return {
    error: false,
    embeds: [embed],
    files,
  };
};

const EvalAcceptCommand = new Command({
  type: CommandType.Button,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
  },
  data: (builder) =>
    builder
      .setLabel('Accept')
      .setEmoji(appConfig.emojis.success)
      .setStyle(ButtonStyle.Success)
      .setDisabled(false)
      .setCustomId(EvalConstants.ACCEPT_CODE_EVALUATION),
  run: async ({ client, interaction }) => {
    const evalEmbed = interaction.message.embeds[0];
    if (!evalEmbed) {
      await EvalAcceptCommand.reply(interaction, {
        preferUpdate: true,
        content: '',
        components: [],
        embeds: [
          Embeds.error(I18n.localize('commands:eval.noEmbed', interaction)),
        ],
      });
      return;
    }

    const noCodeReply = () =>
      EvalAcceptCommand.reply(interaction, {
        preferUpdate: true,
        content: '',
        components: [],
        embeds: [
          Embeds.error(I18n.localize('commands:eval.noCode', interaction)),
        ],
      });

    const input = evalEmbed.description;
    if (!input || input.length === 0) {
      await noCodeReply();
      return;
    }

    const codeblockRegex = /```(?:\w+)?\n([\s\S]*?)\n```/;
    const codeblockMatch = input.match(codeblockRegex);
    if (!codeblockMatch) {
      await noCodeReply();
      return;
    }

    const codeblockContent = codeblockMatch[1];
    if (!codeblockContent) {
      await noCodeReply();
      return;
    }
    const result = await evaluateCode(codeblockContent, {
      client,
      interaction,
    });

    await EvalAcceptCommand.reply(interaction, {
      preferUpdate: true,
      content: '',
      embeds: result.embeds,
      files: result.files ?? [],
      components: [evalAcceptedRow(interaction)],
    });
  },
});

export default EvalAcceptCommand;
