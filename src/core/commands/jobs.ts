import Client from '@core/client';
import { debug } from '@core/logger';
import { Logger } from '@core/logger';
import { TimeUtils } from '@core/utils';
import { CronJob, type CronJobParams } from 'cron';

type ClientJobParams = Omit<
  CronJobParams<() => void | Promise<void>, null>,
  'onTick' | 'timeZone' | 'onComplete' | 'errorHandler'
> & {
  id: string;
  timeZone?: string;
  onTick: (
    client: Client<true>,
    job: CronJob<() => void | Promise<void>, null>,
  ) => void | Promise<void>;
  onComplete?: (
    client: Client<true>,
    job: CronJob<() => void | Promise<void>, null>,
  ) => void | Promise<void>;
  errorHandler?: (
    error: unknown,
    client: Client<true>,
    job: CronJob<() => void | Promise<void>, null>,
  ) => void | Promise<void>;
};

class ClientJob {
  public cronJob: CronJob<() => void | Promise<void>, null> | null = null;
  public get id(): string {
    return this.params.id;
  }

  private readonly debug = debug.commands.jobs.extend(this.id);

  constructor(public readonly params: ClientJobParams) {}

  public readonly init = async (client: Client<true>): Promise<void> => {
    this.debug('Initializing job %s', this.id);

    this.cronJob = CronJob.from({
      ...this.params,
      onTick: async () => {
        if (!this.cronJob) {
          this.debug('Job %s is not initialized', this.id);
          return;
        }

        this.debug('Running job %s', this.id);
        await this.params.onTick(client, this.cronJob);
      },
      onComplete: async () => {
        if (!this.cronJob) {
          this.debug('Job %s is not initialized', this.id);
          return;
        }

        this.debug('Job %s completed', this.id);
        if (this.params.onComplete) {
          await this.params.onComplete(client, this.cronJob);
        }
      },
      errorHandler: async (error) => {
        if (!this.cronJob) {
          this.debug('Job %s is not initialized', this.id);
          return;
        }

        this.debug('Error in job %s: %s', this.id, error);
        if (this.params.errorHandler) {
          await this.params.errorHandler(error, client, this.cronJob);
        } else {
          this.debug('No error handler defined for job %s', this.id);
          Logger.error(`Error in job ${this.id}: ${error}`, new Error().stack);
        }
      },
    } as CronJobParams<() => void | Promise<void>, null>);

    this.cronJob.start();

    const nextDate = this.cronJob.nextDate();

    this.debug(
      'Job %s started, first run at %s',
      this.id,
      `${nextDate.toString()} (in ${TimeUtils.humanReadableMs(
        nextDate.toMillis() - Date.now(),
      )})`,
    );
  };
}

export { ClientJob };
