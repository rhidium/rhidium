import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';

class CommandCooldownWrapper extends DatabaseWrapper<Model.CommandCooldown> {
  constructor() {
    super(Model.CommandCooldown);
  }

  readonly byCooldownId = async (cooldownId: string) => {
    return this.findFirst({ where: { cooldownId } });
  };
}

const commandCooldownWrapper = new CommandCooldownWrapper();

export { commandCooldownWrapper };
