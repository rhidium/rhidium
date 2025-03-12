import { sendAt, CronJob } from 'cron';
import { Client } from '../client';
import { RuntimeUtils } from '../utils';

export type JobRunFunction = (
  client: Client<true>,
  ...args: unknown[]
) => unknown | Promise<unknown>;

export type CommonJobOptions = {
  /**
   * The unique identifier for this job
   */
  id: string;
  /**
   * The function to run
   */
  run: JobRunFunction;
  /**
   * Whether or not this job should only run once
   * @default false
   */
  once?: boolean;
  /**
   * The start delay/timeout in milliseconds
   */
  timeout?: number;
  /**
   * The retry delay/timeout in milliseconds
   */
  retryTimeout?: number;
  /**
   * The pause delay/timeout in milliseconds - how long
   * should we wait before checking if the job has resumed
   */
  timeoutOnPause?: number;
  /**
   * The maximum number of times this job should run
   * before being considered finished
   */
  maxRuns?: number;
  /**
   * The maximum number of times this job should fail,
   * a job fails when the maxRetries is reached and the
   * job still throws an error
   */
  maxFails?: number;
  /**
   * The maximum number of times this job should retry,
   * a job retries when it throws an error
   */
  maxRetries?: number;
  /**
   * The function to run when this job is started
   */
  onStart?: () => void | Promise<void>;
  /**
   * The function to run when this job is stopped,
   * onStop is emitted when maxFails is reached
   */
  onStop?: () => void | Promise<void>;
  /**
   * The function to run when this job is paused
   */
  onPause?: () => void | Promise<void>;
  /**
   * The function to run when this job is resumed
   */
  onResume?: () => void | Promise<void>;
  /**
   * The function to run when this job is finished,
   * onFinish is emitted when maxRuns is reached or
   * once is true
   */
  onFinish?: () => void | Promise<void>;
  /**
   * The function to run when this job is failed,
   * onFail is emitted when maxRetries is reached
   * for a job
   */
  onFail?: (error: Error) => void | Promise<void>;
  /**
   * The function to run when this job is retried
   * because an error was encountered
   */
  onRetry?: () => void | Promise<void>;
  /**
   * The function to run when this job is run
   */
  onRun?: () => void | Promise<void>;
  /**
   * Wether or not we should perform logging for this job
   */
  log?: boolean;
};

export type JobOptionsWithInterval = CommonJobOptions & {
  /**
   * The interval in milliseconds
   */
  interval: number;
  schedule?: never;
};

export type JobOptionsWithSchedule = CommonJobOptions & {
  /**
   * A cron-like string
   */
  schedule: string;
  interval?: never;
};

export type JobOptions = CommonJobOptions &
  (JobOptionsWithInterval | JobOptionsWithSchedule);

export class Job implements CommonJobOptions {
  id: string;
  tag: string;
  run: JobRunFunction;
  interval?: number;
  intervalId?: NodeJS.Timeout;
  schedule?: string;

  once: boolean;
  timeout: number;
  retryTimeout: number;
  timeoutOnPause: number;
  maxRuns?: number;
  maxFails?: number;
  maxRetries?: number;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onFinish?: () => void | Promise<void>;
  onFail?: (error: Error) => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  onRun?: () => void | Promise<void>;
  log: boolean;

  runs = 0;
  fails = 0;
  retries = 0;
  errors = 0;
  paused = false;
  stopped = false;
  firstRun: Date | null = null;
  nextRun: Date | null = null;
  lastRun: Date | null = null;

  cronJob?: CronJob;

  static readonly defaults = {
    once: false,
    timeout: 0,
    retryTimeout: 125,
    timeoutOnPause: 125,
    maxRuns: Infinity,
    maxFails: Infinity,
    maxRetries: 5,
    log: true,
  };

  constructor(options: JobOptions) {
    this.id = options.id;
    this.run = options.run;
    this.tag = `[Job:${this.id}]`;

    this.once = options.once ?? Job.defaults.once;
    this.timeout = options.timeout ?? Job.defaults.timeout;
    this.maxRuns = options.maxRuns ?? Job.defaults.maxRuns;
    this.maxFails = options.maxFails ?? Job.defaults.maxFails;
    this.maxRetries = options.maxRetries ?? Job.defaults.maxRetries;
    this.retryTimeout = options.retryTimeout ?? Job.defaults.retryTimeout;
    this.timeoutOnPause = options.timeoutOnPause ?? Job.defaults.timeoutOnPause;
    this.log = options.log ?? Job.defaults.log;

    if ('interval' in options) this.interval = options.interval;
    if ('schedule' in options) this.schedule = options.schedule;

    if (options.onStart) this.onStart = options.onStart;
    if (options.onStop) this.onStop = options.onStop;
    if (options.onPause) this.onPause = options.onPause;
    if (options.onResume) this.onResume = options.onResume;
    if (options.onFinish) this.onFinish = options.onFinish;
    if (options.onFail) this.onFail = options.onFail;
    if (options.onRetry) this.onRetry = options.onRetry;
    if (options.onRun) this.onRun = options.onRun;
  }

  isScheduled(): this is JobOptionsWithSchedule {
    return !!this.schedule;
  }

  isInterval(): this is JobOptionsWithInterval {
    return !!this.interval;
  }

  async start(client: Client<true>) {
    if (this.log) client.logger.debug(`${this.tag} Starting job ${this.id}`);
    if (this.log && this.isInterval() && this.timeout) {
      const now = new Date();
      const firstRun = new Date(now.getTime() + this.timeout);
      client.logger.debug(`${this.tag} First run at ${firstRun.toISOString()}`);
    }
    if (this.timeout) await RuntimeUtils.sleep(this.timeout);
    if (this.onStart) await this.onStart();
    if (this.isScheduled()) await this.startScheduled(client);
    else if (this.isInterval()) await this.startInterval(client);
  }

  async startInterval(
    client: Client<true>,
    ...args: unknown[]
  ): Promise<boolean> {
    if (!this.isInterval()) return false;

    const intervalCycle = () => {
      if (this.stopped) return;
      if (this.paused) return;
      this.nextRun = new Date(Date.now() + this.interval);
      if (this.log && this.runs !== 0)
        client.logger.debug(
          `${this.tag} Next run at ${this.nextRun.toISOString()}`,
        );
      this.intervalId = setTimeout(async () => {
        if (this.stopped) return;
        if (this.paused) {
          while (this.paused) {
            if (this.stopped) return;
            if (this.log)
              client.logger.debug(
                `${this.tag} Paused, waiting ${this.timeoutOnPause}ms`,
              );
            await RuntimeUtils.sleep(this.timeoutOnPause);
          }
        }
        this.lastRun = new Date();
        await this.runFunction(client, ...args);
        intervalCycle();
      }, this.interval);
    };

    if (!this.stopped && !this.paused) {
      this.firstRun = new Date();
      await this.runFunction(client, ...args);
    }
    intervalCycle();
    return true;
  }

  async startScheduled(
    client: Client<true>,
    ...args: unknown[]
  ): Promise<boolean> {
    if (!this.isScheduled()) return false;
    this.firstRun = sendAt(this.schedule).toJSDate();

    const scheduleCycle = async () => {
      try {
        await new Promise<CronJob>((resolve, reject) => {
          const job: CronJob = new CronJob(this.schedule, async () => {
            if (
              this.stopped ||
              this.paused ||
              (this.maxFails && this.fails >= this.maxFails)
            )
              reject();
            job.stop();
            resolve(job);
          });
          this.nextRun = job.nextDate().toJSDate();
          if (this.log)
            client.logger.debug(
              `${this.tag} Next run at ${this.nextRun.toISOString()}`,
            );
          this.cronJob = job;
          job.start();
        });
      } catch {
        return;
      }

      if (this.stopped) return;
      if (this.paused) {
        while (this.paused) {
          if (this.stopped) return;
          if (this.log)
            client.logger.debug(
              `${this.tag} Paused, waiting ${this.timeoutOnPause}ms`,
            );
          await RuntimeUtils.sleep(this.timeoutOnPause);
        }
      }
      this.lastRun = new Date();
      await this.runFunction(client, ...args);
      void scheduleCycle();
    };

    void scheduleCycle();
    return true;
  }

  async tryToRun(client: Client<true>, ...args: unknown[]) {
    try {
      if (this.log) client.logger.debug(`${this.tag} Running job ${this.id}`);
      this.runs++;
      if (this.onRun) await this.onRun();
      return await this.run(client, ...args);
    } catch (err) {
      if (this.log) client.logger.error(`${this.tag} Error running job`, err);
      this.errors++;
      const error = err instanceof Error ? err : new Error(`${err}`);
      return error;
    }
  }

  async runFunction(client: Client<true>, ...args: unknown[]) {
    let result = await this.tryToRun(client, ...args);

    if (this.log) client.logger.debug(`${this.tag} Initial result`, result);

    if (result instanceof Error) {
      // Conditionally retry the job if it has failed
      while (
        this.maxRetries
          ? this.retries < this.maxRetries
          : result instanceof Error
      ) {
        this.retries++;
        if (this.log)
          client.logger.debug(
            `${this.tag} Retrying job, retry #${this.retries}`,
          );
        if (this.onRetry) await this.onRetry();
        if (typeof this.retryTimeout === 'number') {
          if (this.log) {
            client.logger.debug(
              `${this.tag} Waiting ${this.retryTimeout}ms before retrying`,
            );
          }
          await RuntimeUtils.sleep(this.retryTimeout);
        }
        result = await this.tryToRun(client, ...args);
      }

      // Reset the retries counter before continuing
      // or exiting the job
      if (this.log)
        client.logger.debug(
          `${this.tag} Finished retrying, resetting retries counter`,
        );
      this.retries = 0;

      // Conditionally stop the job if it has failed too many times
      if (result instanceof Error) {
        this.fails++;
        if (this.log)
          client.logger.debug(
            `${this.tag} Failing job, fails now: ${this.fails}`,
          );
        if (this.maxFails && this.fails >= this.maxFails) {
          if (this.log) {
            client.logger.debug(
              `${this.tag} Failed job, ${this.fails} out of ${this.maxFails} fails reached`,
            );
          }
          if (this.onFail) await this.onFail(result);
          await this.stop();
          return result;
        }
      }
    }

    // Conditionally stop the job if it should only run once
    if (this.once) {
      if (this.log)
        client.logger.debug(`${this.tag} Finishing job (once = true)`);
      if (this.onFinish) await this.onFinish();
      await this.stop();
      return result;
    }

    // Conditionally stop the job if it has finished
    else if (this.maxRuns && this.runs >= this.maxRuns) {
      if (this.log) {
        client.logger.debug(
          `${this.tag} Finishing job, ${this.runs} out of ${this.maxRuns} runs completed`,
        );
      }
      if (this.onFinish) await this.onFinish();
      await this.stop();
      return result;
    }

    return result;
  }

  async stop() {
    if (this.isInterval()) clearTimeout(this.intervalId);
    if (this.isScheduled()) this.cronJob?.stop();
    if (this.onStop) await this.onStop();
    this.stopped = true;
  }

  async pause() {
    if (this.isInterval()) clearTimeout(this.intervalId);
    if (this.isScheduled()) this.cronJob?.stop();
    if (this.onPause) await this.onPause();
    this.paused = true;
  }

  async resume() {
    if (this.isInterval()) clearTimeout(this.intervalId);
    if (this.isScheduled()) this.cronJob?.stop();
    if (this.onResume) await this.onResume();
    this.paused = false;
  }
}
