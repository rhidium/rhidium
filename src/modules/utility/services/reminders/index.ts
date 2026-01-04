import { appConfig } from '@core/config/app';
import { Embeds } from '@core/config/embeds';
import { UnitConstants } from '@core/constants/units';
import { DiscordConstants } from '@core/constants/discord';
import { type ResolvedPopulatedReminder } from '@core/database/wrappers';
import {
  ActionRowBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { StringUtils } from '@core/utils/common/strings';
import { TimeUtils } from '@core/utils/common/time';
import { InteractionUtils } from '@core/utils/interactions';

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

  static readonly shortReminderOverview = (
    reminders: ResolvedPopulatedReminder[],
  ) => {
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

  static readonly currentReminderDate = (
    reminder: ResolvedPopulatedReminder,
  ) => {
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
    reminder: ResolvedPopulatedReminder,
  ) => {
    const embed = Embeds.info({
      footer: {
        text: `Reminder ID: ${this.padId(reminder.id, this.DEFAULT_REMINDER_PADDING_LENGTH)}`,
      },
    });

    embed.setTitle('Reminder');
    embed.setDescription(
      StringUtils.truncate(
        reminder.message.length ? reminder.message : 'No message provided',
        DiscordConstants.MAX_MESSAGE_CONTENT_LENGTH,
      ),
    );

    const nextReminder = this.currentReminderDate(reminder);
    const now = Date.now();

    if (nextReminder.getTime() < now) {
      embed.setTitle('Reminder (In The Past)');
      embed.setColor(appConfig.colors.warning);
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
            (process.env['NODE_ENV'] !== 'production'
              ? ' (Might be in the past due to being offline, this is a non-production environment)'
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
    interaction: ModalSubmitInteraction,
  ): Promise<ReminderModalSubmitData | null> => {
    const messageInput = interaction.fields.getField('message');
    if (!('value' in messageInput)) {
      await InteractionUtils.replyDynamic(interaction, {
        embeds: [
          Embeds.error(
            'Invalid modal submission data. Please note that Rhidium currently ONLY support text-based inputs (TextInputBuilder).',
          ),
        ],
      });
      return null;
    }
    const message = messageInput.value;

    if (message.length > DiscordConstants.MAX_MESSAGE_CONTENT_LENGTH) {
      await InteractionUtils.replyDynamic(interaction, {
        embeds: [
          Embeds.error(
            `The message is too long, it must be less than ${DiscordConstants.MAX_MESSAGE_CONTENT_LENGTH} characters, you entered ${message.length}.` +
              `\n\n${StringUtils.truncate(message, DiscordConstants.MAX_MESSAGE_CONTENT_LENGTH)}`,
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
