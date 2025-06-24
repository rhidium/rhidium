import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';

class WorkshopModWrapper extends DatabaseWrapper<Model.WorkshopMod> {
  constructor() {
    super(Model.WorkshopMod);
  }
}

const workshopModWrapper = new WorkshopModWrapper();

export { workshopModWrapper };
