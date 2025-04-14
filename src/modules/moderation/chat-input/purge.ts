import { AttachmentBuilder, ChannelType } from 'discord.js';
import { ModLogServices } from '../services/mod-log';
import { Command, CommandType, Permissions, PermLevel } from '@core/commands';
import { ChannelUtils, InputUtils, StringUtils, TimeUtils } from '@core/utils';
import { EmbedConstants, UnitConstants } from '@core/constants';
import { Embeds } from '@core/config';
import { Database } from '@core/database';

const PurgeCommand = new Command({
  type: CommandType.ChatInputPlain,
  enabled: {
    guildOnly: true,
  },
  permissions: {
    level: PermLevel.Moderator,
  },
  interactions: {
    replyEphemeral: true,
    deferReply: true,
    refuseUncached: true,
  },
  data: (builder) =>
    builder
      .setName('purge')
      .setDescription(
        'Delete a number of messages from a channel or across all channels.',
      )
      .addIntegerOption((option) =>
        option
          .setName('amount')
          .setDescription('The amount of messages to delete.')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(1000),
      )
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to delete messages from.')
          .setRequired(false),
      )
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('The channel to delete messages from.')
          .setRequired(false)
          .addChannelTypes(ChannelType.GuildText),
      )
      .addBooleanOption((option) =>
        option
          .setName('bot')
          .setDescription('Only delete messages from bots.')
          .setRequired(false),
      )
      .addStringOption((option) =>
        InputUtils.Duration.addOptionHandler(option, {
          name: 'since',
          description: 'Delete messages since a certain time, max 14 days.',
          required: false,
        }),
      ),
  run: async ({ client, interaction }) => {
    const { options, guild: discordGuild } = interaction;

    const amount = options.getInteger('amount');
    const targetUser = options.getUser('user');
    const targetChannel = options.getChannel('channel');
    const botsOnly = options.getBoolean('bot') ?? false;
    const since = options.getString('since');
    const sinceMs = since
      ? InputUtils.Duration.inputToMs(since, UnitConstants.MS_IN_ONE_WEEK * 2)
      : null;

    if (
      !targetUser &&
      !targetChannel &&
      !botsOnly &&
      amount === null &&
      !since
    ) {
      await PurgeCommand.reply(interaction, {
        embeds: [
          Embeds.error(
            'You must specify a `user`, `channel`, an `amount` of messages to delete, a time to delete messages `since`, or enable bots only.',
          ),
        ],
      });
      return;
    }

    if (!targetChannel && !since) {
      await PurgeCommand.reply(interaction, {
        embeds: [
          Embeds.error(
            'You must specify a `channel` or a time to delete messages `since` to narrow down the search.',
          ),
        ],
      });
      return;
    }

    const clientId = client.user.id;
    const targetUserId = targetUser?.id ?? null;
    const targetChannelId = targetChannel?.id ?? null;
    const requiredPermissions = [Permissions.FLAGS.ManageMessages];

    let matched = 0;
    const matchedChannels = new Set<string>();
    const twoWeeksAgo = Date.now() - UnitConstants.MS_IN_ONE_WEEK * 2;
    const globalConditions = () => {
      return amount === null || matched < amount;
    };

    const stoppedEarly: string[] = [];
    const [messageLists, interval] = await Promise.all([
      ChannelUtils.fetchMessages(
        discordGuild,
        (channel) =>
          globalConditions() &&
          (!targetChannelId || channel.id === targetChannelId) &&
          Permissions.hasChannelPermissions(
            clientId,
            channel,
            requiredPermissions,
          ) === true,
        (message) => {
          const match =
            globalConditions() &&
            (!sinceMs || message.createdTimestamp >= sinceMs) &&
            (!targetUserId || message.author.id === targetUserId) &&
            (!botsOnly || message.author.bot);

          if (match) {
            matched++;
            matchedChannels.add(message.channel.id);
          }

          return match;
        },
        (_channel, lastMessage, messageList) =>
          globalConditions() &&
          lastMessage.createdTimestamp >= twoWeeksAgo &&
          (!sinceMs || lastMessage.createdTimestamp >= sinceMs) &&
          (() => {
            if (!targetUserId) return true;

            if (!messageList.some((m) => m.author.id === targetUserId)) {
              stoppedEarly.push(_channel.id);
              return false;
            }

            return true;
          })(),
        () => !globalConditions(),
      ),
      setInterval(async () => {
        await PurgeCommand.reply(interaction, {
          embeds: [
            Embeds.waiting(
              `Fetching messages, this may take a while... (${matched} matched across ${
                matchedChannels.size
              } channel(s)${
                targetUserId
                  ? `, stopped early in ${stoppedEarly.length} channel(s)`
                  : ''
              })`,
            ),
          ],
        });
      }, UnitConstants.MS_IN_ONE_SECOND * 5),
      PurgeCommand.reply(interaction, {
        embeds: [Embeds.waiting('Fetching messages, this may take a while...')],
      }),
    ]);

    clearInterval(interval);

    if (matched === 0) {
      await PurgeCommand.reply(interaction, {
        embeds: [Embeds.warning('No messages matched the criteria.')],
      });
      return;
    }

    const queryFields = [
      {
        name: 'Amount',
        value: amount?.toString() ?? 'All',
        inline: true,
      },
      {
        name: 'User',
        value: targetUser?.toString() ?? 'All users',
        inline: true,
      },
      {
        name: 'Channel',
        value: targetChannel?.toString() ?? 'All channels',
        inline: true,
      },
      {
        name: 'Bots Only',
        value: botsOnly ? 'Yes' : 'No',
        inline: true,
      },
      {
        name: 'Since',
        value: since ?? 'All',
        inline: true,
      },
    ];

    const confirmString =
      `Moderator: ${interaction.user.tag} (${interaction.user.id})\nTotal Messages: ${matched}\n\n` +
      queryFields.map((field) => `${field.name}: ${field.value}`).join('\n') +
      '\n\n' +
      messageLists
        .filter((messageCollection) => messageCollection.size > 0)
        .map((messageCollection) => {
          return messageCollection
            .map(
              (message) =>
                `[[${TimeUtils.humanReadableMs(
                  Date.now() - message.createdTimestamp,
                  1,
                )} ago]](<${message.url}>) ${StringUtils.truncate(message.author.displayName, 10)}: ${StringUtils.truncate(
                  message.content,
                  25,
                )}`,
            )
            .join('\n');
        })
        .join('\n');
    const confirmStringTooLong =
      confirmString.length > EmbedConstants.DESCRIPTION_MAX_LENGTH - 255;

    await InputUtils.Confirmation.promptConfirmation({
      interaction,
      content: {
        embeds: [
          Embeds.warning({
            description:
              `Are you sure you want to delete ${matched} message(s)? This action cannot be undone.` +
              (confirmStringTooLong ? '' : '\n\n' + confirmString),
            footer: {
              text: targetUserId
                ? `Stopped early in ${stoppedEarly.length} channel(s)`
                : '',
            },
          }),
        ],
        files: confirmStringTooLong
          ? [
              new AttachmentBuilder(
                Buffer.from(confirmString, 'utf-8'),
              ).setName(`purge-${interaction.id}-confirm.txt`),
            ]
          : [],
      },
      async onCancel(interaction) {
        await PurgeCommand.reply(interaction, {
          content: '',
          components: [],
          embeds: [Embeds.info('Purge cancelled.')],
        });
      },
      onConfirm: async (i) => {
        await i.deferUpdate();

        const result = await ChannelUtils.deleteMessages(
          discordGuild,
          messageLists,
        );
        const output = ChannelUtils.parseDeleteMessagesResult(result);

        const shared = {
          title: 'Purge' + ` (${matched} message(s) deleted)`,
        };

        const outputTooLong =
          output.length > EmbedConstants.DESCRIPTION_MAX_LENGTH - 255;
        const debugFile = new AttachmentBuilder(Buffer.from(output, 'utf-8'))
          .setName(`purge-${interaction.id}.txt`)
          .setDescription('Overview of messages deleted by purge command.');

        await Promise.all([
          i.isRepliable()
            ? i.editReply({
                content: '',
                components: [],
                files: outputTooLong ? [debugFile] : [],
                embeds: [
                  Embeds.info({
                    ...shared,
                    description: outputTooLong ? '' : output,
                  }),
                ],
              })
            : null,
          ModLogServices.send({
            guild: await Database.Guild.resolve(discordGuild.id),
            discordGuild,
            message: {
              files: outputTooLong ? [debugFile] : [],
              embeds: [
                Embeds.info({
                  ...shared,
                  description: outputTooLong ? '' : output,
                  fields: [
                    {
                      name: 'Moderator',
                      value: interaction.user.toString(),
                      inline: false,
                    },
                    ...queryFields,
                  ],
                }),
              ],
            },
          }),
        ]);
      },
    });
  },
});

export default PurgeCommand;
