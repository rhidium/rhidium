import { groupedDiscordPlaceholders } from '@client/placeholders';
import { CommandType, AutoCompleteOption } from '@core';

const PlaceholderGroupOption = new AutoCompleteOption<CommandType>({
  name: 'placeholder-group',
  description: 'Select the placeholder group',
  required: true,
  lowercaseQuery: true,
  run: async (query) => {
    return Object.keys(groupedDiscordPlaceholders)
      .filter(
        (placeholderGroup) =>
          placeholderGroup.toLowerCase().indexOf(query) >= 0,
      )
      .map((placeholderGroup) => ({
        name: placeholderGroup,
        value: placeholderGroup,
      }));
  },
});

export default PlaceholderGroupOption;
