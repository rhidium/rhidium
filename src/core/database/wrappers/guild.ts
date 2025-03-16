import { Model } from '../models';
import { PopulatedGuild } from '../select';
import { DatabaseWrapper } from './wrapper';

class GuildWrapper extends DatabaseWrapper<Model.Guild> {
  constructor() {
    super(Model.Guild);
  }

  async resolve(id: string): Promise<PopulatedGuild> {
    return this.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }
}

const guildWrapper = new GuildWrapper();

export { guildWrapper };
