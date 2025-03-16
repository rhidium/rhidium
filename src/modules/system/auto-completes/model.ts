import { AutoCompleteOption, Model } from '@core';

const choices = Object.entries(Model).map(([key, value]) => ({
  name: key,
  value,
}));

const ModelOption = new AutoCompleteOption<Model>({
  name: 'model',
  description: 'Select the database model',
  required: true,
  run: async (query) => {
    const models = choices.filter((s) => s.value.startsWith(query));
    if (!models.length) return [];

    return models;
  },
});

export default ModelOption;
