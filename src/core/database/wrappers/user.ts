import { RiskLevel } from '@prisma/client';
import { Model } from '../models';
import { PopulatedUser } from '../select';
import { DatabaseWrapper } from './wrapper';

class UserWrapper extends DatabaseWrapper<Model.User> {
  constructor() {
    super(Model.User);
  }

  readonly resolve = async (discordId: string): Promise<PopulatedUser> => {
    return this.upsert({
      where: { id: discordId },
      create: {
        id: discordId,
        risk: RiskLevel.NONE,
        riskOriginGuildIds: [],
      },
      update: {},
    });
  };
}

const userWrapper = new UserWrapper();

export { userWrapper };
