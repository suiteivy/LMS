/**
 * Active Route Tracker
 * 
 * Provides synchronous access to the currently focused route path.
 * Used by api.ts and toast.ts to detect when requests resolve after the user
 * has navigated away to a different screen, preventing out-of-scope error popups.
 */

let _currentActiveRoute: string = '/';

export const setActiveRoute = (route: string) => {
  if (typeof route === 'string') {
    _currentActiveRoute = route.trim() || '/';
  }
};

export const getActiveRoute = (): string => {
  return _currentActiveRoute;
};
