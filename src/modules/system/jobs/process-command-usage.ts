import { ClientJob } from '@core/commands/jobs';
import { Database } from '@core/database/wrappers';
import { logger } from '@core/logger';

const Logger = logger();

const midnight = '0 0 * * *';

const ProcessCommandUsageJob = new ClientJob({
  id: 'process-command-usage',
  timeZone: 'UTC',
  cronTime: midnight,
  start: true,
  runOnInit: true,
  async onTick() {
    Logger.debug('Processing command usage');
    await Database.Command.summarizeCommandUsage().then(async () => {
      await Database.Settings.updateSingleton({
        commandUsageSummaryLastProcessedAt: new Date(),
      });
    });
  },
  errorHandler(error) {
    Logger.error('Error processing command usage', error);
  },
});

export default ProcessCommandUsageJob;
