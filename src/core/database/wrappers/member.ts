import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';

class MemberWrapper extends DatabaseWrapper<Model.Member> {
  constructor() {
    super(Model.Member);
  }
}

const memberWrapper = new MemberWrapper();

export { memberWrapper };
