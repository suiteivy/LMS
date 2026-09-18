import Toast from 'react-native-toast-message';

const activeToasts = new Set<string>();

const toastKey = (title: string, message?: string) => `${title}::${message || ''}`;

export interface ToastOptions {
    autoHide?: boolean;
    code?: string;
    visibilityTime?: number;
    onPress?: () => void;
}

/**
 * Checks if a toast contains substantial information that warrants remaining on-screen
 * until explicitly dismissed or acknowledged by the user.
 * Criteria:
 * - Combined title + message > 85 characters
 * - Word count > 15 words
 * - Critical security / system status codes (ACCOUNT_LOCKED, ACCOUNT_DISABLED, RATE_LIMIT_EXCEEDED)
 */
export const isSubstantialToast = (title?: string, message?: string, code?: string): boolean => {
    const fullText = `${title || ''} ${message || ''}`.trim();
    if (fullText.length > 85) return true;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    if (wordCount > 15) return true;
    if (code && ['ACCOUNT_LOCKED', 'ACCOUNT_DISABLED', 'RATE_LIMIT_EXCEEDED'].includes(code)) return true;
    return false;
};

const resolveToastConfig = (
    title: string,
    message?: string,
    options?: ToastOptions,
    defaultVisibility = 3000
) => {
    const isSubstantial = isSubstantialToast(title, message, options?.code);
    const autoHide = options?.autoHide !== undefined ? options.autoHide : !isSubstantial;
    const visibilityTime = options?.visibilityTime ?? (isSubstantial ? 8000 : defaultVisibility);

    return { autoHide, visibilityTime };
};

export const showSuccess = (title: string, message?: string, options?: ToastOptions) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    const { autoHide, visibilityTime } = resolveToastConfig(title, message, options, 3000);
    Toast.show({
        type: 'success',
        text1: title,
        text2: message,
        position: 'top',
        autoHide,
        visibilityTime,
        onPress: () => {
            options?.onPress?.();
            Toast.hide();
            activeToasts.delete(key);
        },
        onHide: () => activeToasts.delete(key),
    });
};

export const showError = (title: string, message?: string, options?: ToastOptions) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    const { autoHide, visibilityTime } = resolveToastConfig(title, message, options, 4000);
    Toast.show({
        type: 'error',
        text1: title,
        text2: message,
        position: 'top',
        autoHide,
        visibilityTime,
        onPress: () => {
            options?.onPress?.();
            Toast.hide();
            activeToasts.delete(key);
        },
        onHide: () => activeToasts.delete(key),
    });
};

export const showWarning = (title: string, message?: string, options?: ToastOptions) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    const { autoHide, visibilityTime } = resolveToastConfig(title, message, options, 4000);
    Toast.show({
        type: 'info',
        text1: title,
        text2: message,
        position: 'top',
        autoHide,
        visibilityTime,
        onPress: () => {
            options?.onPress?.();
            Toast.hide();
            activeToasts.delete(key);
        },
        onHide: () => activeToasts.delete(key),
    });
};

export const showInfo = (title: string, message?: string, options?: ToastOptions) => {
    const key = toastKey(title, message);
    if (activeToasts.has(key)) return;
    activeToasts.add(key);
    const { autoHide, visibilityTime } = resolveToastConfig(title, message, options, 3000);
    Toast.show({
        type: 'info',
        text1: title,
        text2: message,
        position: 'top',
        autoHide,
        visibilityTime,
        onPress: () => {
            options?.onPress?.();
            Toast.hide();
            activeToasts.delete(key);
        },
        onHide: () => activeToasts.delete(key),
    });
};

/**
 * Gracefully displays a non-blocking toast when data fetching fails.
 * Protects users from raw technical error dumps while ensuring silent failures do not leave
 * the screen in an unexplained empty/broken state.
 */
export const showFetchError = (resource: string, error?: any, options?: ToastOptions) => {
    const rawMessage = typeof error === 'string'
        ? error
        : error?.message || error?.error_description || error?.error;

    // Suppress if auth error (handled by auth interceptor) or deliberate cancellation/abort
    if (error?.isAuthError || (rawMessage && /abort|cancelled|canceled/i.test(rawMessage))) {
        return;
    }

    const title = `Unable to load ${resource}`;
    const message = "Please check your connection or try again shortly.";

    showError(title, message, options);
};

