import { Client } from '@core';
import { usageStatisticsQueue } from './jobs/process-usage-statistics';

export const clientExtensions = { usageStatisticsQueue };

export type ClientWithUsageStatistics = Client & {
  extensions: {
    usageStatisticsQueue: typeof usageStatisticsQueue;
  };
};

export class ClientExtensions {
  static readonly extensions = clientExtensions;
  static readonly hasUsageStatisticsQueue = (
    client: Client,
  ): client is ClientWithUsageStatistics => {
    return !!client.extensions.usageStatisticsQueue;
  };
}
