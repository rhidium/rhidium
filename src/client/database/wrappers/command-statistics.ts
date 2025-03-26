import { Model } from '../models';
import { DatabaseWrapper } from './wrapper';

class CommandStatisticsWrapper extends DatabaseWrapper<Model.CommandStatistics> {
  constructor() {
    super(Model.CommandStatistics);
  }
}

const commandStatisticsWrapper = new CommandStatisticsWrapper();

export { commandStatisticsWrapper };
