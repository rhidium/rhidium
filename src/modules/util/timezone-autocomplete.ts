import { Command, CommandType } from '@core/commands';
import { InputUtils } from '@core/utils';

export default new Command({
  type: CommandType.AutoComplete,
  data: (builder) =>
    builder
      .setName('timezone')
      .setDescription('Select a timezone')
      .setAutocomplete(true),
  run: async (_client, interaction) => {
    const query = interaction.options.getFocused().toLowerCase();
    const filtered = InputUtils.DateTime.lowercasedTimezones.filter(
      (tz) => tz.indexOf(query) >= 0,
    );

    return filtered.map((tz) => ({
      name: InputUtils.DateTime.resolveLowercasedTimezone(tz) ?? tz,
      value: tz,
    }));
  },
});
