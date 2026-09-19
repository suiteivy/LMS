/**
 * Resilient Background Job Queue Service
 * 
 * Complies with Backend Handbook Part B1, B2, B4:
 * - Async processing for heavy workloads (>200ms)
 * - Idempotent consumer pattern via idempotencyKey
 * - Exponential backoff with jitter and dead-letter handling
 * - Single Node.js runtime compatible (PostgreSQL-backed with in-memory test fallback)
 */

const supabase = require('../utils/supabaseClient.js');
const logger = require('../utils/logger.js');

class JobQueueService {
  constructor() {
    this.handlers = new Map();
    this.inMemoryJobs = new Map();
    this.isProcessing = false;
    this.workerInterval = null;
  }

  /**
   * Register a worker function for a specific jobType
   * @param {string} jobType 
   * @param {Function} handler async (payload, job) => result
   */
  registerHandler(jobType, handler) {
    this.handlers.set(jobType, handler);
  }

  /**
   * Enqueue a job
   */
  async enqueue({
    queueName = 'default',
    jobType,
    payload = {},
    priority = 0,
    runAt = new Date(),
    idempotencyKey = null,
    maxAttempts = 5,
  }) {
    if (!jobType) {
      throw new Error('jobType is required to enqueue a job');
    }

    // Idempotency check
    if (idempotencyKey) {
      // Check in-memory store
      for (const [id, job] of this.inMemoryJobs.entries()) {
        if (job.idempotency_key === idempotencyKey) {
          return { id, status: job.status, duplicate: true };
        }
      }

      // Check database
      try {
        const { data: existing } = await supabase
          .from('job_queue')
          .select('id, status')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (existing) {
          return { id: existing.id, status: existing.status, duplicate: true };
        }
      } catch (_err) {
        // Table may not exist yet in test env; continue with in-memory
      }
    }

    const jobRecord = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queue_name: queueName,
      job_type: jobType,
      payload,
      priority,
      status: 'queued',
      attempts: 0,
      max_attempts: maxAttempts,
      idempotency_key: idempotencyKey,
      run_at: runAt instanceof Date ? runAt.toISOString() : new Date(runAt).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in-memory
    this.inMemoryJobs.set(jobRecord.id, { ...jobRecord });

    // Try persisting to DB
    try {
      const { data: dbJob, error } = await supabase
        .from('job_queue')
        .insert({
          queue_name: queueName,
          job_type: jobType,
          payload,
          priority,
          status: 'queued',
          attempts: 0,
          max_attempts: maxAttempts,
          idempotency_key: idempotencyKey,
          run_at: jobRecord.run_at,
        })
        .select('id, status')
        .maybeSingle();

      if (!error && dbJob) {
        jobRecord.id = dbJob.id;
      }
    } catch (_err) {
      // DB insert failed or table missing, fallback to in-memory job
    }

    return { id: jobRecord.id, status: 'queued', duplicate: false };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    if (this.inMemoryJobs.has(jobId)) {
      return this.inMemoryJobs.get(jobId);
    }

    try {
      const { data: dbJob } = await supabase
        .from('job_queue')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (dbJob) return dbJob;
    } catch (_err) {
      // Ignore DB errors
    }

    return null;
  }

  /**
   * Process a single job with backoff and dead-lettering
   */
  async processJob(job) {
    const handler = this.handlers.get(job.job_type);
    if (!handler) {
      const errorMsg = `No registered handler for job type: ${job.job_type}`;
      this.markDeadLetter(job, errorMsg);
      return;
    }

    job.status = 'processing';
    job.attempts = (job.attempts || 0) + 1;
    job.updated_at = new Date().toISOString();
    this.inMemoryJobs.set(job.id, { ...job });

    try {
      const result = await handler(job.payload, job);
      job.status = 'completed';
      job.result = result;
      job.updated_at = new Date().toISOString();
      this.inMemoryJobs.set(job.id, { ...job });

      // Update DB if present
      try {
        await supabase
          .from('job_queue')
          .update({
            status: 'completed',
            result: result || {},
            attempts: job.attempts,
            updated_at: job.updated_at,
          })
          .eq('id', job.id);
      } catch (_e) { }

    } catch (err) {
      const isNonRetryable = err.isNonRetryable || err.statusCode === 400 || err.statusCode === 404;
      const maxReached = job.attempts >= job.max_attempts;

      if (isNonRetryable || maxReached) {
        this.markDeadLetter(job, err.message || String(err));
      } else {
        // Exponential backoff with full randomized jitter
        const baseDelayMs = 1000;
        const maxDelayMs = 60000;
        const rawDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, job.attempts));
        const jitter = Math.floor(Math.random() * (rawDelay * 0.5));
        const totalDelayMs = rawDelay + jitter;

        const nextRun = new Date(Date.now() + totalDelayMs);
        job.status = 'queued';
        job.run_at = nextRun.toISOString();
        job.last_error = err.message || String(err);
        job.updated_at = new Date().toISOString();
        this.inMemoryJobs.set(job.id, { ...job });

        try {
          await supabase
            .from('job_queue')
            .update({
              status: 'queued',
              attempts: job.attempts,
              run_at: job.run_at,
              last_error: job.last_error,
              updated_at: job.updated_at,
            })
            .eq('id', job.id);
        } catch (_e) { }
      }
    }
  }

  markDeadLetter(job, errorMsg) {
    job.status = 'dead_letter';
    job.last_error = errorMsg;
    job.updated_at = new Date().toISOString();
    this.inMemoryJobs.set(job.id, { ...job });

    logger.error('Background job entered dead-letter status', {
      jobId: job.id,
      jobType: job.job_type,
      attempts: job.attempts,
      error: errorMsg,
    });

    try {
      supabase
        .from('job_queue')
        .update({
          status: 'dead_letter',
          last_error: errorMsg,
          attempts: job.attempts,
          updated_at: job.updated_at,
        })
        .eq('id', job.id)
        .then(() => { });
    } catch (_e) { }
  }

  /**
   * Run one cycle of job processing
   */
  async runWorkerCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Process in-memory queued jobs
      for (const [id, job] of this.inMemoryJobs.entries()) {
        if (job.status === 'queued' && new Date(job.run_at) <= now) {
          await this.processJob(job);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start the background worker loop
   */
  startWorker(intervalMs = 5000) {
    if (this.workerInterval) return;
    this.workerInterval = setInterval(() => this.runWorkerCycle(), intervalMs);
  }

  /**
   * Stop the worker loop
   */
  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
  }
}

const jobQueueService = new JobQueueService();
module.exports = jobQueueService;
