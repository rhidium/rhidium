import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { DiscordConstants } from '@core/constants/discord';
import { Database } from '@core/database/wrappers';
import { SlashCommandStringOption } from 'discord.js';

const data = new SlashCommandStringOption()
  .setName('reminder')
  .setDescription('Select a reminder');

const ReminderAutoComplete = new Command({
  data,
  type: CommandType.AutoComplete,
  run: async ({ interaction }) => {
    const query = interaction.options.getFocused().toLowerCase();
    const reminders = await Database.Reminder.forUser(interaction.user.id);

    await interaction.respond(
      reminders
        .slice(0, DiscordConstants.MAX_OPTIONS_OR_CHOICES_PER_COMPONENT)
        .filter((reminder) => reminder.message.toLowerCase().includes(query))
        .map((reminder) => ({
          name: reminder.message,
          value: `${reminder.id}`,
        })),
    );
  },
  resolver: async ({ interaction, options }) => {
    const { optionName = data.name, optionRequired = data.required } =
      options || {};
    const value = interaction.options.getString(optionName, optionRequired);
    const reminders = await Database.Reminder.forUser(interaction.user.id);

    return reminders.find((r) => `${r.id}` === value) ?? null;
  },
});

export default ReminderAutoComplete;
