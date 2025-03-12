import { SelectMenuCommand } from '@core';

// Please Note: This component is disabled by default, and is only included
// for completeness - with this, the `src/modules/system` directory serves
// as a complete reference for the available command/component types.

const ExampleSelectMenuCommand = new SelectMenuCommand({
  disabled: true,
  customId: 'example',
  run: async (_client, interaction) => {
    await interaction.reply('You clicked the example select menu!');
  },
});

export default ExampleSelectMenuCommand;
