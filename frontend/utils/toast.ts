import Toast from 'react-native-toast-message';

const activeToasts = new Set<string>();

const toastKey = (title: string, message?: string) => `${title}::${message || ''}`;

export const showSuccess = (title: string, message?: string) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    Toast.show({
        type: 'success',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
        onHide: () => activeToasts.delete(key),
    });
};

export const showError = (title: string, message?: string) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    Toast.show({
        type: 'error',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 4000,
        onHide: () => activeToasts.delete(key),
    });
};

export const showWarning = (title: string, message?: string) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    Toast.show({
        type: 'info',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 4000,
        onHide: () => activeToasts.delete(key),
    });
};

export const showInfo = (title: string, message?: string) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    Toast.show({
        type: 'info',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
        onHide: () => activeToasts.delete(key),
    });
};

/**
 * Gracefully displays a non-blocking toast when data fetching fails.
 * Protects users from raw technical error dumps while ensuring silent failures do not leave
 * the screen in an unexplained empty/broken state.
 */
export const showFetchError = (resource: string, error?: any) => {
    const rawMessage = typeof error === 'string'
        ? error
        : error?.message || error?.error_description || error?.error;

    // Suppress if the error indicates deliberate cancellation or abort
    if (rawMessage && /abort|cancelled|canceled/i.test(rawMessage)) {
        return;
    }

    const title = `Unable to load ${resource}`;
    const message = "Please check your connection or try again shortly.";

    showError(title, message);
};

