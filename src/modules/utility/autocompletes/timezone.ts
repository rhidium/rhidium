import { Command } from '@core/commands/base';
import { CommandType } from '@core/commands/types';
import { DiscordConstants } from '@core/constants/discord';
import { InputUtils } from '@core/utils/inputs';
import { SlashCommandStringOption } from 'discord.js';

const data = new SlashCommandStringOption()
  .setName('timezone')
  .setDescription('Select a timezone')
  .setAutocomplete(true);

const TimezoneAutocomplete = new Command({
  data,
  type: CommandType.AutoComplete,
  run: async ({ interaction }) => {
    const query = interaction.options.getFocused().toLowerCase();
    const filtered = InputUtils.DateTime.lowercasedTimezones.filter(
      (tz) => tz.indexOf(query) >= 0,
    );

    await interaction.respond(
      filtered
        .slice(0, DiscordConstants.MAX_OPTIONS_OR_CHOICES_PER_COMPONENT)
        .map((tz) => ({
          name: InputUtils.DateTime.resolveLowercasedTimezone(tz) ?? tz,
          value: tz,
        })),
    );
  },
  resolver: async ({ interaction, options }) => {
    const { optionName = data.name, optionRequired = data.required } =
      options || {};
    const value = interaction.options.getString(optionName, optionRequired);

    if (value === null) return null;

    return InputUtils.DateTime.resolveLowercasedTimezone(value) ?? null;
  },
});

export default TimezoneAutocomplete;
