import { Model } from '../models';
import { type PopulatedSettings } from '../select';
import { DatabaseWrapper } from './wrapper';

class SettingsWrapper extends DatabaseWrapper<Model.Settings> {
  constructor() {
    super(Model.Settings);
  }

  async resolveSingleton(): Promise<PopulatedSettings> {
    return this.upsert({
      where: { id: 'singleton' },
      create: {
        commandUsageSummaryLastProcessedAt: null,
      },
      update: {},
    });
  }

  async updateSingleton(
    data: Parameters<typeof this.update>[0]['data'],
  ): Promise<PopulatedSettings> {
    return this.update({
      where: { id: 'singleton' },
      data,
    });
  }
}

const settingsWrapper = new SettingsWrapper();

export { settingsWrapper };
