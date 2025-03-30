import { ClientJob } from '@client/commands';
import { Database } from '@client/database';
import { Logger } from '@client/logger';

const midnight = '0 0 * * *';

const ProcessCommandUsageJob = new ClientJob({
  id: 'process-command-usage',
  timeZone: 'UTC',
  cronTime: midnight,
  start: true,
  runOnInit: true,
  async onTick() {
    Logger.debug('Processing command usage');
    await Database.Command.summarizeCommandUsage();
  },
  errorHandler(error) {
    Logger.error('Error processing command usage', error);
  },
});

export default ProcessCommandUsageJob;
