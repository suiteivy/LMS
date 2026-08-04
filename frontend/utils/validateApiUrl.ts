/**
 * Runtime assertion that catches double `/api/api/` segments in API URLs.
 * Call this in request interceptors or at app init to fail fast.
 */
export function assertNoDoubleApiSegment(url: string): void {
  if (/\/api\/api(\/|$)/i.test(url)) {
    const error = new Error(
      `Malformed API URL detected: "${url}" contains /api/api/. ` +
        `Check your EXPO_PUBLIC_API_URL env var and call-site path construction.`
    );
    // In development, throw to make it immediately visible.
    // In production, log a loud error but don't crash the app.
    if (__DEV__) {
      throw error;
    } else {
      console.error('[API URL Validation]', error.message);
    }
  }
}
