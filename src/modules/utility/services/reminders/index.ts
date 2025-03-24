import {
  appConfig,
  Client,
  DiscordConstants,
  InteractionUtils,
  Reminder,
  StringUtils,
  TimeUtils,
  UnitConstants,
} from '@core';
import {
  ActionRowBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

type ReminderModalSubmitData = {
  message: string;
};

class ReminderServices {
  private constructor() {}

  static readonly DEFAULT_REMINDER_PADDING_LENGTH = 5;

  static readonly resolveMaxLength = (ids: number[]) => {
    return Math.max(
      ids.reduce((acc, id) => {
        if (id.toString().length > acc) {
          return id.toString().length;
        }
        return acc;
      }, 0),
      this.DEFAULT_REMINDER_PADDING_LENGTH,
    );
  };

  static readonly undoReminderIdPadding = (id: string) =>
    parseInt(id.replace(/^0+/, ''));

  static readonly padId = (id: number, longestId: number) =>
    id.toString().padStart(longestId, '0');

  static readonly shortReminderOverview = (reminders: Reminder[]) => {
    const longestId = this.resolveMaxLength(
      reminders.map((reminder) => reminder.id),
    );
    return reminders.map(
      (reminder) =>
        `• \`${this.padId(reminder.id, longestId)}\` - <t:${Math.floor(
          this.currentReminderDate(reminder).getTime() /
            UnitConstants.MS_IN_ONE_SECOND,
        )}:R> - ${reminder.message}`,
    );
  };

  static readonly currentReminderDate = (reminder: Reminder) => {
    if (!reminder.repeatEvery) {
      return reminder.remindAt;
    }

    const now = Date.now();
    const reminderTs = reminder.remindAt.getTime();
    const diff = now - reminderTs;

    if (diff < 0) {
      return reminder.remindAt;
    }

    const repeatEvery = reminder.repeatEvery;
    const nextReminder =
      reminderTs + Math.ceil(diff / repeatEvery) * repeatEvery;

    return new Date(nextReminder);
  };

  static readonly createReminderEmbed = (
    client: Client,
    reminder: Reminder,
  ) => {
    const embed = client.embeds.info({
      footer: {
        text: `Reminder ID: ${this.padId(reminder.id, this.DEFAULT_REMINDER_PADDING_LENGTH)}`,
      },
    });

    embed.setTitle('Reminder');
    embed.setDescription(
      StringUtils.truncate(
        reminder.message.length ? reminder.message : 'No message provided',
        DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH,
      ),
    );

    const nextReminder = this.currentReminderDate(reminder);
    const now = Date.now();

    if (nextReminder.getTime() < now) {
      embed.setTitle('Reminder (In The Past)');
      embed.setColor(client.colors.warning);
    } else {
      embed.addFields({
        name: 'Reminding You At',
        value: TimeUtils.discordInfoTimestamp(nextReminder.valueOf()),
      });

      if (reminder.repeatEvery && reminder.repeatEvery > 0) {
        embed.addFields({
          name: 'Repeating Every',
          value:
            '**' +
            TimeUtils.humanReadableMs(reminder.repeatEvery) +
            '**' +
            (reminder.repeatUntil
              ? ` until ${TimeUtils.discordInfoTimestamp(reminder.repeatUntil.valueOf())}`
              : '') +
            (appConfig.NODE_ENV === 'development'
              ? ' (Might be in the past due to being offline, this is a development environment)'
              : ''),
        });
      }
    }

    return embed;
  };

  static readonly createReminderModal = new ModalBuilder()
    .setTitle('Create a reminder')
    .setCustomId('@reminders:create')
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setStyle(TextInputStyle.Paragraph)
          .setLabel('Message')
          .setPlaceholder('Enter the message for the reminder')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2000),
      ),
    );

  static readonly reminderDataFromModalSubmit = async (
    client: Client,
    interaction: ModalSubmitInteraction,
  ): Promise<ReminderModalSubmitData | null> => {
    const message = interaction.fields.getField('message').value;

    if (message.length > DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH) {
      await InteractionUtils.replyEphemeral(interaction, {
        embeds: [
          client.embeds.error(
            `The message is too long, it must be less than ${DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH} characters, you entered ${message.length}.` +
              `\n\n${StringUtils.truncate(message, DiscordConstants.MESSAGE_CONTENT_MAX_LENGTH)}`,
          ),
        ],
      });
      return null;
    }

    return {
      message,
    };
  };
}

export { ReminderServices, type ReminderModalSubmitData };
