/**
 * Human-readable formatters for credential delivery link expiration.
 */

export function formatCredentialExpiry(expiresAt?: string | Date | null): string {
  if (!expiresAt) return 'Valid for 24 hours';

  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return 'Valid for 24 hours';

    const now = Date.now();
    const diffMs = expiryDate.getTime() - now;

    const localDateString = expiryDate.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (diffMs <= 0) {
      return `Expired on ${localDateString}`;
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let durationText = '';
    if (hours > 0) {
      durationText = `${hours} hr${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min${minutes > 1 ? 's' : ''}` : ''}`;
    } else {
      durationText = `${Math.max(1, minutes)} min${minutes > 1 ? 's' : ''}`;
    }

    return `Expires in ${durationText} (${localDateString})`;
  } catch {
    return 'Valid for 24 hours';
  }
}

export function formatCredentialExpirySimple(expiresAt?: string | Date | null): string {
  if (!expiresAt) return '24 hours';
  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return '24 hours';

    const diffMs = expiryDate.getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${Math.max(1, minutes)}m`;
  } catch {
    return '24 hours';
  }
}
