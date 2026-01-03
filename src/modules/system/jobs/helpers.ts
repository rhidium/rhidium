import { Database } from "@core/database/wrappers";
import { logger } from "@core/logger";

const Logger = logger();

const checkShouldRun = async () => {
  const settings = await Database.Settings.resolveSingleton();

  const lastProcessedAt = settings.commandUsageSummaryLastProcessedAt;
  if (!lastProcessedAt) {
    Logger.debug('Command usage summary has never been processed');
    return true;
  }

  const now = new Date();
  const nextRun = new Date(lastProcessedAt);
  nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  nextRun.setUTCHours(0, 0, 0, 0);

  if (now >= nextRun) {
    Logger.debug('Command usage summary should be processed');
    return true;
  }

  Logger.debug('Command usage summary should not be processed yet');
  return false;
};

const backlogCommandUsage = async () => {
  const shouldRun = await checkShouldRun();

  if (shouldRun) {
    Logger.debug('Backlogging command usage summary');
    await Database.Command.summarizeCommandUsage();

    Logger.debug('Command usage summary backlogged');
    await Database.Settings.updateSingleton({
      commandUsageSummaryLastProcessedAt: new Date(),
    });
  } else {
    Logger.debug('Command usage summary is up to date');
  }

  Logger.debug('Backlogged command usage summary');
};

export {
  backlogCommandUsage,
}