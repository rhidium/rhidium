import {
  CommandType,
  AutoCompleteOption,
  lowercaseDiscordPlaceholderStrings,
  discordPlaceholderStrings,
} from '@core';

const PlaceholderOption = new AutoCompleteOption<CommandType>({
  name: 'placeholder',
  description: 'Select the placeholder',
  required: true,
  lowercaseQuery: true,
  run: async (query) => {
    return lowercaseDiscordPlaceholderStrings
      .filter((placeholder) => placeholder.indexOf(query) >= 0)
      .map((placeholder) => {
        const original = discordPlaceholderStrings.find(
          (e) => e.toLowerCase() === placeholder,
        ) as string;
        return {
          name: original,
          value: original,
        };
      });
  },
});

export default PlaceholderOption;
