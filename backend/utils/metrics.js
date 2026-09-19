/**
 * 4 Golden Signals Metrics Collector
 * 
 * Complies with Backend Handbook Part D3:
 * - Latency (p50, p95, p99)
 * - Traffic (requests per min, total requests)
 * - Errors (4xx, 5xx counts and percentage)
 * - Saturation (process heap memory, event loop/uptime)
 */

class MetricsCollector {
  constructor(maxLatencySamples = 1000) {
    this.maxLatencySamples = maxLatencySamples;
    this.latencies = []; // rolling window of response times in ms
    this.totalRequests = 0;
    this.statusCounts = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    };
    this.startedAt = Date.now();
    this.minuteBuckets = new Map(); // minuteKey -> count
  }

  recordRequest(durationMs, statusCode) {
    this.totalRequests += 1;

    // Record latency sample
    if (this.latencies.length >= this.maxLatencySamples) {
      this.latencies.shift();
    }
    this.latencies.push(durationMs);

    // Record status category
    if (statusCode >= 200 && statusCode < 300) this.statusCounts['2xx'] += 1;
    else if (statusCode >= 300 && statusCode < 400) this.statusCounts['3xx'] += 1;
    else if (statusCode >= 400 && statusCode < 500) this.statusCounts['4xx'] += 1;
    else if (statusCode >= 500) this.statusCounts['5xx'] += 1;

    // Traffic per minute
    const minuteKey = Math.floor(Date.now() / 60000);
    this.minuteBuckets.set(minuteKey, (this.minuteBuckets.get(minuteKey) || 0) + 1);

    // Keep only last 10 minutes of buckets
    if (this.minuteBuckets.size > 10) {
      const oldestKey = Math.min(...this.minuteBuckets.keys());
      this.minuteBuckets.delete(oldestKey);
    }
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  getMetrics() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = this.getPercentile(sorted, 50);
    const p95 = this.getPercentile(sorted, 95);
    const p99 = this.getPercentile(sorted, 99);
    const avg = sorted.length > 0
      ? Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) / 100
      : 0;

    const currentMinute = Math.floor(Date.now() / 60000);
    const requestsLastMinute = this.minuteBuckets.get(currentMinute) || 0;
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    const memoryUsage = process.memoryUsage();
    const errorTotal = this.statusCounts['4xx'] + this.statusCounts['5xx'];
    const errorRatePercent = this.totalRequests > 0
      ? Math.round((errorTotal / this.totalRequests) * 10000) / 100
      : 0;

    return {
      uptime_seconds: uptimeSeconds,
      traffic: {
        total_requests: this.totalRequests,
        requests_last_minute: requestsLastMinute,
        req_per_second_avg: uptimeSeconds > 0 ? Math.round((this.totalRequests / uptimeSeconds) * 100) / 100 : 0,
      },
      latency_ms: {
        avg,
        p50,
        p95,
        p99,
        sample_count: sorted.length,
      },
      errors: {
        total_errors: errorTotal,
        rate_percentage: errorRatePercent,
        by_status: { ...this.statusCounts },
      },
      saturation: {
        heap_used_mb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heap_total_mb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rss_mb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }

  reset() {
    this.latencies = [];
    this.totalRequests = 0;
    this.statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    this.minuteBuckets.clear();
  }
}

const metricsCollector = new MetricsCollector();
module.exports = metricsCollector;
