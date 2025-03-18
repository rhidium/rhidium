import { AutoCompleteOption, Model, modelChoices } from '@core';

const ModelOption = new AutoCompleteOption<Model>({
  name: 'model',
  description: 'Select the database model',
  required: true,
  run: async (query) => {
    const models = modelChoices.filter((s) => s.value.startsWith(query));
    if (!models.length) return [];

    return models;
  },
});

export default ModelOption;
