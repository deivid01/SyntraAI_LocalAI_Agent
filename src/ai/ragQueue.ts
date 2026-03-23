import { EventEmitter } from 'events';
import logger from '../core/logger';

export interface RagJob {
  id: string;
  source: string;
  type: 'github' | 'web' | 'pdf' | 'wikipedia' | 'stackoverflow';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  data?: any;
}

export class RagQueue extends EventEmitter {
  private static instance: RagQueue;
  private jobs: Map<string, RagJob> = new Map();
  private isProcessing: boolean = false;

  private constructor() {
    super();
  }

  public static getInstance(): RagQueue {
    if (!RagQueue.instance) {
      RagQueue.instance = new RagQueue();
    }
    return RagQueue.instance;
  }

  public addJob(job: Omit<RagJob, 'id' | 'status' | 'progress'>): string {
    const id = Math.random().toString(36).substring(7);
    const newJob: RagJob = { ...job, id, status: 'pending', progress: 0 };
    this.jobs.set(id, newJob);
    logger.info('RagQueue', `New job added: ${id} (${job.source})`);
    this.processNext();
    return id;
  }

  public getJob(id: string): RagJob | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): RagJob[] {
    return Array.from(this.jobs.values());
  }

  public updateJobStatus(id: string, update: Partial<RagJob>): void {
    const job = this.jobs.get(id);
    if (job) {
      const updatedJob = { ...job, ...update };
      this.jobs.set(id, updatedJob);
      this.emit('job-updated', updatedJob);
    }
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    
    const nextJob = Array.from(this.jobs.values()).find(j => j.status === 'pending');
    if (!nextJob) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    this.updateJobStatus(nextJob.id, { status: 'processing' });
    
    // The actual processing will be triggered by ragIngestionEngine
    // using this queue as a source of tasks.
    this.isProcessing = false;
    this.processNext();
  }
}

export const ragQueue = RagQueue.getInstance();
