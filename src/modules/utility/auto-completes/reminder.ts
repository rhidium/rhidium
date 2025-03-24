import { AutoCompleteOption, Database, Reminder } from '@core';

const ReminderOption = new AutoCompleteOption<Reminder>({
  name: 'reminder',
  description: 'Select a reminder',
  required: false,
  lowercaseQuery: true,
  run: async (query, _client, interaction) => {
    const reminders = await Database.Reminder.forUser(interaction.user.id);

    return reminders
      .filter((reminder) => reminder.message.toLowerCase().includes(query))
      .map((reminder) => ({
        name: reminder.message,
        value: `${reminder.id}`,
      }));
  },
  resolveValue: async (value, _client, interaction) => {
    if (!value) return null;

    const reminders = await Database.Reminder.forUser(interaction.user.id);
    const reminder = reminders.find((r) => `${r.id}` === value);

    return reminder ?? null;
  },
});

export default ReminderOption;
