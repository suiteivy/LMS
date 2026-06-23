const { retryScheduledNotificationDeliveries } = require('../services/notificationDelivery.service.js');

const run = async () => {
  try {
    const limit = Number(process.env.NOTIFICATION_RETRY_BATCH_SIZE || 100);
    const result = await retryScheduledNotificationDeliveries({ limit });
    // eslint-disable-next-line no-console
    console.log('[notification-retries] done', result);
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notification-retries] failed', error?.message || error);
    process.exit(1);
  }
};

run();
