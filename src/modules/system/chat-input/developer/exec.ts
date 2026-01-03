import { Command, CommandType, PermLevel } from '@core/commands';
import { appConfig, Embeds } from '@core/config';
import { EmbedConstants, UnitConstants } from '@core/constants';
import { TimeUtils } from '@core/utils';
import { exec } from 'child_process';
import { type BaseMessageOptions } from 'discord.js';

const ExecCommand = new Command({
  type: CommandType.ChatInputPlain,
  permissions: {
    level: PermLevel['Bot Administrator'],
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
  },
  enabled: {
    guilds: appConfig.client.development_server_id
      ? [appConfig.client.development_server_id]
      : false,
  },
  data: (builder) =>
    builder
      .setName('exec')
      .setDescription(
        'Execute a console/terminal command, rejects after 15 minutes',
      )
      .setDefaultMemberPermissions(0)
      .addStringOption((option) =>
        option
          .setName('command')
          .setDescription('The command to execute')
          .setRequired(true)
          .setMinLength(1),
      ),
  run: async ({ interaction }) => {
    const { options } = interaction;
    const command = options.getString('command', true);
    const execStartTime = process.hrtime.bigint();

    let output: string;
    try {
      output = await new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Command execution timed out'));
        }, 15 * UnitConstants.MS_IN_ONE_SECOND);
        exec(command, (error, stdout, stderr) => {
          if (error || stderr) reject(error || new Error(stderr));
          else resolve(stdout);
        });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`${err}`);
      const execTime = TimeUtils.bigIntDurationToHumanReadable(execStartTime);
      await ExecCommand.reply(
        interaction,
        Embeds.error({
          title: 'Command execution failed',
          description: `Error:\n\`\`\`${error.message}\`\`\``,
          fields: [
            {
              name: 'Time Taken',
              value: `\`\`\`fix\n${execTime}\`\`\``,
            },
          ],
        }),
      );
      return;
    }

    const execTime = TimeUtils.bigIntDurationToHumanReadable(execStartTime);
    const stdout = output;
    const contentTooLong =
      stdout.length > EmbedConstants.FIELD_VALUE_MAX_LENGTH - 6;
    const ctx: BaseMessageOptions = {
      embeds: [
        Embeds.success({
          title: 'Command execution successful',
          fields: [
            {
              name: ':inbox_tray: Command',
              value: `\`\`\`${command}\`\`\``,
              inline: false,
            },
            {
              name: ':outbox_tray: Output',
              value: `\`\`\`${contentTooLong ? 'See File Attachment' : stdout}\`\`\``,
              inline: false,
            },
            {
              name: 'Time Taken',
              value: `\`\`\`fix\n${execTime}\`\`\``,
            },
          ],
        }),
      ],
      files: [],
    };
    if (stdout.length > EmbedConstants.FIELD_VALUE_MAX_LENGTH) {
      ctx.files = [
        {
          name: 'stdout.txt',
          attachment: Buffer.from(stdout),
        },
      ];
    }

    await ExecCommand.reply(interaction, ctx);
  },
});

export default ExecCommand;
