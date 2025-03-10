import { Client } from '../client';
import { Job } from '.';
import { Collection } from 'discord.js';
import { ClusterUtils } from '../utils';

export class ClientJobManager {
  client: Client<true>;
  jobs: Collection<string, Job>;
  tag: string;
  constructor(client: Client<true>, jobs?: Job[]) {
    this.client = client;
    this.jobs = new Collection();
    if (jobs) jobs.forEach((job) => this.addJob(job));
    this.tag = ClusterUtils.hasCluster(client)
      ? `[ClientJobManager Cluster-${client.cluster.id}]`
      : '[ClientJobManager]';
  }

  async startAll() {
    await Promise.all(this.jobs.map((job) => job.start(this.client)));
  }

  async stopAll() {
    await Promise.all(this.jobs.map((job) => job.stop()));
  }

  addJob(job: Job) {
    this.jobs.set(job.id, job);
    return this.jobs;
  }

  async startJob(id: string) {
    const job = this.getJob(id);
    if (!job) return false;
    await job.start(this.client);
    return this.jobs;
  }

  async stopJob(id: string) {
    const job = this.getJob(id);
    if (!job) return false;
    await job.stop();
    return this.jobs;
  }

  async pauseJob(id: string) {
    const job = this.getJob(id);
    if (!job) return false;
    await job.pause();
    return this.jobs;
  }

  async resumeJob(id: string) {
    const job = this.getJob(id);
    if (!job) return false;
    await job.resume();
    return this.jobs;
  }

  async removeJob(id: string) {
    const job = this.getJob(id);
    if (!job) return false;
    await this.stopJob(id);
    return this.jobs.delete(id);
  }

  getJob(id: string) {
    return this.jobs.get(id);
  }
}
