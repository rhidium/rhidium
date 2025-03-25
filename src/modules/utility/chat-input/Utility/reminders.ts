import {
  appConfig,
  ChatInputCommand,
  CommandCooldownType,
  Database,
  DateSingleResult,
  DiscordConstants,
  InputUtils,
  isAutoCompleteResponseType,
  PermLevel,
  UnitConstants,
} from '@core';
import {
  AttachmentBuilder,
  ChannelType,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js';
import {
  ReminderModalSubmitData,
  ReminderServices,
} from '../../services/reminders';
import { ReminderScheduler } from '../../services/reminders/scheduler';
import { stripIndents } from 'common-tags';
import ReminderOption from '../../auto-completes/reminder';

const frequentIntervalThreshold = UnitConstants.MS_IN_ONE_MINUTE * 30;
const frequentIntervalMaxRuntime = UnitConstants.MS_IN_ONE_DAY * 7;

const maxRemindersPerUser = 100;
const minRepeatEveryMs =
  appConfig.NODE_ENV === 'production'
    ? UnitConstants.MS_IN_ONE_MINUTE * 5
    : UnitConstants.MS_IN_ONE_SECOND;

const RemindersCommand = new ChatInputCommand({
  permLevel: PermLevel.User,
  isEphemeral: true,
  cooldown: {
    enabled: true,
    duration: 5,
    persistent: false,
    type: CommandCooldownType.User,
    usages: 1,
  },
  guildOnly: false,
  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('Manage your reminders')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .setNSFW(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List all your reminders')
        .addBooleanOption((option) =>
          option
            .setName('compact')
            .setDescription('Display your reminders in a short/compact format')
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Add a reminder')
        .addStringOption((option) =>
          InputUtils.DateTime.addOptionHandler(option, {
            name: 'when',
            description: 'When to remind you',
            required: true,
          }),
        )
        .addStringOption((option) =>
          option
            .setName('what')
            .setDescription(
              'What to remind you of, you are shown a modal for additional information if not provided',
            )
            .setRequired(false)
            .setMinLength(1)
            .setMaxLength(DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH),
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription(
              'The channel to send the reminder to, defaults to current channel',
            )
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addBooleanOption((option) =>
          option
            .setName('should-dm')
            .setDescription('Send the reminder be sent as a DM')
            .setRequired(false),
        )
        .addStringOption((option) =>
          InputUtils.Duration.addOptionHandler(option, {
            name: 'repeat-every',
            description: 'Set the reminder to repeat every specified time',
            shortSuffix: true,
            required: false,
          }),
        )
        .addStringOption((option) =>
          InputUtils.DateTime.addOptionHandler(option, {
            name: 'repeat-until',
            description: 'Set the reminder to repeat until the specified date',
            required: false,
          }),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel/remove a reminder')
        .addStringOption((option) => ReminderOption.addOptionHandler(option))
        .addBooleanOption((option) =>
          option
            .setName('all-for-server')
            .setDescription(
              'Remove all your reminders that you set in this server (if used in a server)',
            )
            .setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName('all')
            .setDescription('Remove all your reminders')
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('when')
        .setDescription('Displays when a reminder is set to remind you')
        .addStringOption((option) =>
          ReminderOption.addOptionHandler(option, { required: true }),
        ),
    ),
  run: async (client, interaction) => {
    const { options } = interaction;
    const subcommand = options.getSubcommand();

    const resolveWhen = async (
      _when: string,
      timezone: string,
      referenceDate = new Date(),
    ): Promise<Date | false> => {
      const when = InputUtils.DateTime.parseHumanDateTimeInput({
        input: _when,
        timezone,
        referenceDate,
      });

      if (typeof when === 'undefined' || when.length === 0) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error(
            'Invalid time format, please use a valid format.' +
              InputUtils.DateTime.formatSuffix,
          ),
        );
        return false;
      }

      if (when.length > 1) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error(
            'Multiple time formats/date-ranges detected, please provide only one.',
          ),
        );
        return false;
      }

      const [resolvedWhen] = when;

      return (resolvedWhen as DateSingleResult)[1];
    };

    if (subcommand === 'when') {
      const reminder = await ReminderOption.getValue(interaction, true);

      if (isAutoCompleteResponseType(reminder)) {
        return;
      }

      await RemindersCommand.reply(
        interaction,
        ReminderServices.createReminderEmbed(client, reminder),
      );
    } else if (subcommand === 'list') {
      const isShort = options.getBoolean('compact') ?? false;
      const reminders = await Database.Reminder.forUser(interaction.user.id);

      if (reminders.length === 0) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.info('You currently have no reminders set.'),
        );
        return;
      }

      if (isShort) {
        const reminderContent =
          ReminderServices.shortReminderOverview(reminders).join('\n');

        if (
          reminderContent.length > DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH
        ) {
          await RemindersCommand.reply(interaction, {
            files: [
              new AttachmentBuilder(Buffer.from(reminderContent)).setName(
                'reminders.txt',
              ),
            ],
          });
          return;
        }

        await RemindersCommand.reply(
          interaction,
          client.embeds.info(reminderContent),
        );
        return;
      }

      let content = '';
      const firstTenReminders = reminders.slice(0, 10);
      const reminderEmbeds = firstTenReminders.map((reminder) =>
        ReminderServices.createReminderEmbed(client, reminder),
      );

      if (reminders.length > 10) {
        content = `Showing 10 out of ${
          reminders.length
        } reminders. Use ${await client.commandManager.commandLink(
          'reminders',
          'list',
        )} to see all reminders.`;
      }

      await RemindersCommand.reply(interaction, {
        embeds: reminderEmbeds,
        content,
      });
    } else if (subcommand === 'create') {
      const reminders = await Database.Reminder.forUser(interaction.user.id);

      if (reminders.length >= maxRemindersPerUser) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error(
            `You have reached the maximum number of reminders allowed per user (${maxRemindersPerUser}). Consider removing/cancelling some reminders.`,
          ),
        );
        return;
      }

      const _when = options.getString('when', true);
      const what = options.getString('what');
      const channel = options.getChannel('channel') ?? interaction.channel;
      const shouldDM =
        options.getBoolean('should-dm') ?? !interaction.inGuild();
      const repeatEvery = options.getString('repeat-every');
      const _repeatUntil = options.getString('repeat-until');

      const user = await Database.User.resolve(interaction.user.id);

      if (!user.timezone) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error({
            title: 'No Timezone Set',
            description: stripIndents`
              You have not configured a timezone. Please set a timezone using ${await client.commandManager.commandLink('timestamp', 'timezone')}.
            `,
          }),
        );
        return;
      }

      const when = await resolveWhen(_when, user.timezone);
      const repeatUntil = _repeatUntil
        ? await resolveWhen(_repeatUntil, user.timezone)
        : null;

      if (when === false || repeatUntil === false) {
        return;
      }

      const diff = when.getTime() - Date.now();

      if (diff < 0) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error('The reminder time must be in the future.'),
        );
        return;
      }

      if (diff > Number.MAX_SAFE_INTEGER) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error(
            'The reminder time is too far in the future, please set a reminder closer to the current time.',
          ),
        );
        return;
      }

      const repeatEveryMs =
        repeatEvery !== null
          ? InputUtils.Duration.inputToMs(repeatEvery)
          : null;

      if (repeatEvery !== null) {
        if (repeatEveryMs === null) {
          await RemindersCommand.reply(
            interaction,
            client.embeds.error(
              'Invalid repeat every format, please use a valid format.' +
                InputUtils.Duration.formatSuffix,
            ),
          );
          return;
        }

        if (repeatEveryMs < minRepeatEveryMs) {
          await RemindersCommand.reply(
            interaction,
            client.embeds.error(
              'The `repeat-every` time must be at least 5 minutes.',
            ),
          );
          return;
        }

        if (repeatEveryMs < frequentIntervalThreshold) {
          const totalRuntime =
            repeatUntil === null
              ? Infinity
              : repeatUntil.valueOf() - when.valueOf();

          if (totalRuntime > frequentIntervalMaxRuntime) {
            await RemindersCommand.reply(
              interaction,
              client.embeds.error(
                'The reminder will run too frequently for too long, please set a longer interval or a shorter runtime.',
              ),
            );
            return;
          }
        }
      }

      if (repeatUntil !== null) {
        if (repeatUntil.valueOf() < when.valueOf()) {
          await RemindersCommand.reply(
            interaction,
            client.embeds.error(
              'The repeat until date must be after the reminder time.',
            ),
          );
          return;
        }
        if (repeatUntil.valueOf() < Date.now()) {
          await RemindersCommand.reply(
            interaction,
            client.embeds.error('The repeat until date must be in the future.'),
          );
          return;
        }
      }

      let collected;
      let modalSubmitResponse: ReminderModalSubmitData | null = null;
      if (!what) {
        await interaction.showModal(ReminderServices.createReminderModal);

        try {
          collected = await interaction.awaitModalSubmit({
            time: UnitConstants.MS_IN_ONE_HOUR,
            filter: (i) => i.user.id === interaction.user.id,
            dispose: true,
          });
        } catch (error) {
          await RemindersCommand.reply(
            interaction,
            client.embeds.error(
              'You took too long to respond, the reminder has been cancelled.',
            ),
          );
          return;
        }

        modalSubmitResponse =
          await ReminderServices.reminderDataFromModalSubmit(client, collected);

        if (!modalSubmitResponse) {
          return;
        }
      }

      const { message } = {
        message: what,
        ...modalSubmitResponse,
      };

      const resolvedMessage = message ?? what;

      if (!resolvedMessage) {
        throw new Error('Unresolved message to create reminder with');
      }

      const [reminder] = await Promise.all([
        Database.Reminder.createResolved({
          UserId: interaction.user.id,
          channelId: shouldDM ? null : (channel?.id ?? null),
          remindAt: when,
          message: resolvedMessage,
          shouldDM,
          repeatEvery: repeatEveryMs,
          repeatUntil: repeatUntil ?? null,
          GuildId: interaction.guildId,
        }),
        RemindersCommand.deferReplyInternal(collected ?? interaction),
      ]);

      await ReminderScheduler.scheduleReminder(client, reminder);

      const text = `Reminder set for <t:${Math.floor(
        reminder.remindAt.getTime() / 1000,
      )}:R> with ID: ${reminder.id}${
        shouldDM
          ? ` and will be sent as a DM - make sure you share a server with me (<@${
              client.user.id
            }>) where you have DMs enabled!`
          : ''
      }`;

      if (collected) {
        await collected.editReply({ embeds: [client.embeds.success(text)] });
      } else {
        await RemindersCommand.reply(interaction, {
          embeds: [
            client.embeds.success(text),
            ReminderServices.createReminderEmbed(client, reminder),
          ],
        });
      }
    } else if (subcommand === 'cancel') {
      const reminder = await ReminderOption.getValue(interaction, false);
      const all = options.getBoolean('all') ?? false;
      const allForServer = options.getBoolean('all-for-server') ?? false;

      if (all || allForServer) {
        const reminders = await Database.Reminder.forUser(
          interaction.user.id,
        ).then((reminders) =>
          allForServer && interaction.guildId
            ? reminders.filter((r) => r.GuildId === interaction.guildId)
            : reminders,
        );

        await Database.Reminder.deleteMany({
          id: {
            in: reminders.map((r) => r.id),
          },
        });

        reminders.forEach((e) => ReminderScheduler.cancelReminder(e.id));

        const output = `The following ${reminders.length} reminders have been removed: \`${reminders
          .map((r) =>
            ReminderServices.padId(
              r.id,
              ReminderServices.DEFAULT_REMINDER_PADDING_LENGTH,
            ),
          )
          .join('`, `')}\``;

        if (output.length > DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH) {
          await RemindersCommand.reply(interaction, {
            files: [
              new AttachmentBuilder(Buffer.from(output)).setName(
                'removed-reminders.txt',
              ),
            ],
          });
        } else {
          await RemindersCommand.reply(
            interaction,
            client.embeds.success(output),
          );
        }

        return;
      }

      if (!reminder) {
        await RemindersCommand.reply(
          interaction,
          client.embeds.error(
            'Either provide the `all`/`all-for-server` option or select/click a reminder from the list',
          ),
        );
        return;
      }

      await Database.Reminder.delete({ id: reminder.id });

      await RemindersCommand.reply(interaction, {
        embeds: [
          client.embeds.success(
            `Reminder with ID \`${ReminderServices.padId(reminder.id, ReminderServices.DEFAULT_REMINDER_PADDING_LENGTH)}\` has been removed`,
          ),
          ReminderServices.createReminderEmbed(client, reminder),
        ],
      });
    }
  },
});

export default RemindersCommand;
