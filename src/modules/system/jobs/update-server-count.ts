import { ClusterServices } from '../services';
import { Job, UnitConstants } from '@core';

const UpdateServerCountJob = new Job({
  id: 'update-server-count',
  // Let's update every 30 minutes
  interval: UnitConstants.MS_IN_ONE_MINUTE * 30,
  // Set timeout, as we need some time for our clusters and/or shards to come online
  timeout: UnitConstants.MS_IN_ONE_MINUTE * 5,
  // Don't retry, rate-limit sensitive
  maxRetries: 0,
  run: ClusterServices.updateServerCount,
});

export default UpdateServerCountJob;
