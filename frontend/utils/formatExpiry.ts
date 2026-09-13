/**
 * Human-readable formatters for credential delivery link expiration.
 */

export function formatCredentialExpiry(expiresAt?: string | Date | null): string {
  if (!expiresAt) return 'Valid for 7 days';

  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return 'Valid for 7 days';

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
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    let durationText = '';
    if (days > 0) {
      durationText = `${days} day${days > 1 ? 's' : ''}${hours > 0 ? ` ${hours} hr${hours > 1 ? 's' : ''}` : ''}`;
    } else if (hours > 0) {
      durationText = `${hours} hr${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min${minutes > 1 ? 's' : ''}` : ''}`;
    } else {
      durationText = `${Math.max(1, minutes)} min${minutes > 1 ? 's' : ''}`;
    }

    return `Expires in ${durationText} (${localDateString})`;
  } catch {
    return 'Valid for 7 days';
  }
}

export function formatCredentialExpirySimple(expiresAt?: string | Date | null): string {
  if (!expiresAt) return '7 days';
  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return '7 days';

    const diffMs = expiryDate.getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${Math.max(1, minutes)}m`;
  } catch {
    return '7 days';
  }
}
