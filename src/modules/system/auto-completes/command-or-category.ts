import { APICommand, Command, CommandType } from '@core/commands';
import { StringUtils } from '@core/utils';
import { SlashCommandStringOption } from 'discord.js';

type CommandOrCategory = APICommand | string;

const data = new SlashCommandStringOption()
  .setName('command-or-category')
  .setDescription('Select a command or category')
  .setRequired(false)
  .setAutocomplete(true);

const CommandOrCategoryCommand = new Command({
  data,
  type: CommandType.AutoComplete,
  run: ({ client, interaction }) => {
    const { options } = interaction;
    const focusedValue = options.getFocused().toLowerCase();
    const commands = client.manager.apiCommands
      .filter((cmd) => {
        return (
          cmd.data.name.toLowerCase().includes(focusedValue) ||
          !!(
            cmd.category && cmd.category.toLowerCase().includes(focusedValue)
          ) ||
          !!(
            'description' in cmd.data &&
            cmd.data.description.toLowerCase().includes(focusedValue)
          )
        );
      })
      .map((cmd) => ({
        name: StringUtils.truncate(
          `${cmd.data.name} (${cmd.category ?? 'Uncategorized'}) - ${
            'description' in cmd.data
              ? cmd.data.description
              : 'No description available'
          }`,
          100,
        ),
        value: cmd.id,
      }));
    const categories = client.manager.flatCommandCategories
      .filter((cat) => cat.toLowerCase().includes(focusedValue))
      .map((cat) => ({
        name: StringUtils.truncate(`Category: ${cat}`, 100),
        value: cat,
      }));

    return interaction.respond(
      [...categories, ...commands]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 25),
    );
  },
  resolver: ({ client, interaction, options }) => {
    const { optionName = data.name, optionRequired = data.required } =
      options || {};
    const value = interaction.options.getString(optionName, optionRequired);

    if (value === null) {
      return null;
    }

    const command = client.manager.apiCommands.find((cmd) => cmd.id === value);
    if (command) {
      return command;
    }

    const category = client.manager.flatCommandCategories.find(
      (cat) => cat === value,
    );
    if (category) {
      return category;
    }

    return null;
  },
});

export {
  CommandOrCategoryCommand as default,
  type CommandOrCategory,
  data as CommandOrCategoryData,
};
