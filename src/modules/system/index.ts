import { ComponentRegistry } from '@core/commands';
import ProcessCommandUsageJob from './jobs/process-command-usage';
import ClientReady from './listeners/ready';

const systemRegistry = [
  ProcessCommandUsageJob,
  ClientReady,
] as ComponentRegistry;

export default systemRegistry;
