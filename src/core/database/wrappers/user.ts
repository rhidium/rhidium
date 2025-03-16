import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';

class UserWrapper extends DatabaseWrapper<Model.User> {
  constructor() {
    super(Model.User);
  }
}

const userWrapper = new UserWrapper();

export { userWrapper };
