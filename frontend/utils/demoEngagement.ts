/**
 * Lightweight, privacy-friendly Demo Engagement Tracker.
 * Stores session exploration data in sessionStorage (web) or memory.
 * Complies with Section 2 of LMS Landing Page Changes.
 */
import { Platform } from 'react-native';
import { SITE_CONFIG } from '@/constants/siteConfig';

const STORAGE_KEY = 'cloudora_demo_engagement';
const DRAFT_KEY = 'cloudora_demo_feedback_draft';
const NOTICE_DISMISSED_KEY = 'cloudora_demo_notice_dismissed';
const FEEDBACK_SUBMITTED_KEY = 'cloudora_demo_feedback_submitted';

export interface ModuleEngagement {
  openedAt: number;
  timeSpentMs: number;
  actionsCount: number;
}

export interface DemoSessionData {
  modules: Record<string, ModuleEngagement>;
  activeModule: string | null;
  activeModuleStart: number | null;
  totalInteractions: number;
  sessionStart: number;
  isEngaged: boolean;
}

// In-memory fallback if sessionStorage is unavailable
let memorySession: DemoSessionData = {
  modules: {},
  activeModule: null,
  activeModuleStart: null,
  totalInteractions: 0,
  sessionStart: Date.now(),
  isEngaged: false,
};

let memoryDraft: any = null;
let memoryNoticeDismissed = false;
let memoryFeedbackSubmitted = false;

function getStoredSession(): DemoSessionData {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return memorySession;
}

function saveSession(data: DemoSessionData) {
  memorySession = data;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }
}

/**
 * Record when a user opens a demo module (student, teacher, parent, admin).
 */
export function recordDemoModuleOpen(moduleRole: string) {
  const session = getStoredSession();
  const now = Date.now();

  // If there was an active module, close its duration first
  if (session.activeModule && session.activeModuleStart) {
    const elapsed = now - session.activeModuleStart;
    const existing = session.modules[session.activeModule] || {
      openedAt: session.activeModuleStart,
      timeSpentMs: 0,
      actionsCount: 0,
    };
    existing.timeSpentMs += elapsed;
    session.modules[session.activeModule] = existing;
  }

  session.activeModule = moduleRole;
  session.activeModuleStart = now;

  if (!session.modules[moduleRole]) {
    session.modules[moduleRole] = {
      openedAt: now,
      timeSpentMs: 0,
      actionsCount: 0,
    };
  }

  saveSession(session);
}

/**
 * Record an action/interaction inside a demo module.
 */
export function recordDemoAction(moduleRole?: string) {
  const session = getStoredSession();
  session.totalInteractions = (session.totalInteractions || 0) + 1;

  const target = moduleRole || session.activeModule;
  if (target && session.modules[target]) {
    session.modules[target].actionsCount += 1;
  }

  // Any action immediately qualifies as engaged
  session.isEngaged = true;
  saveSession(session);
}

/**
 * Record when the user exits a demo module.
 */
export function recordDemoModuleExit(moduleRole?: string) {
  const session = getStoredSession();
  const now = Date.now();
  const target = moduleRole || session.activeModule;

  if (target && session.activeModuleStart) {
    const elapsed = now - session.activeModuleStart;
    const existing = session.modules[target] || {
      openedAt: session.activeModuleStart,
      timeSpentMs: 0,
      actionsCount: 0,
    };
    existing.timeSpentMs += elapsed;
    session.modules[target] = existing;

    // Check threshold
    const thresholdMs = (SITE_CONFIG.engagementThresholdSeconds || 5) * 1000;
    if (existing.timeSpentMs >= thresholdMs || existing.actionsCount > 0) {
      session.isEngaged = true;
    }
  }

  session.activeModule = null;
  session.activeModuleStart = null;
  saveSession(session);
}

/**
 * Check if the user has engaged with demo modules beyond the minimal threshold.
 */
export function isUserDemoEngaged(): boolean {
  const session = getStoredSession();
  if (session.isEngaged || session.totalInteractions > 0) return true;

  // Also check cumulative time across all modules
  const thresholdMs = (SITE_CONFIG.engagementThresholdSeconds || 5) * 1000;
  let totalTime = 0;

  // Include ongoing active module
  if (session.activeModule && session.activeModuleStart) {
    totalTime += Date.now() - session.activeModuleStart;
  }

  for (const m of Object.values(session.modules)) {
    totalTime += m.timeSpentMs || 0;
    if (m.actionsCount > 0) return true;
  }

  return totalTime >= thresholdMs;
}

/**
 * Get list of module names explored in this session.
 */
export function getExploredDemoModules(): string[] {
  const session = getStoredSession();
  const set = new Set<string>();

  if (session.activeModule) set.add(session.activeModule);
  Object.keys(session.modules || {}).forEach((mod) => set.add(mod));

  return Array.from(set);
}

/**
 * Check if the top notice was dismissed in this session.
 */
export function isNoticeDismissed(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(NOTICE_DISMISSED_KEY) === 'true';
    } catch {}
  }
  return memoryNoticeDismissed;
}

export function dismissDemoNotice() {
  memoryNoticeDismissed = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(NOTICE_DISMISSED_KEY, 'true');
    } catch {}
  }
}

/**
 * Check if feedback was already submitted in this session.
 */
export function isFeedbackSubmitted(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return window.sessionStorage.getItem(FEEDBACK_SUBMITTED_KEY) === 'true';
    } catch {}
  }
  return memoryFeedbackSubmitted;
}

export function markFeedbackSubmitted() {
  memoryFeedbackSubmitted = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(FEEDBACK_SUBMITTED_KEY, 'true');
    } catch {}
  }
}

/**
 * Session Draft Preservation for the Feedback Form.
 */
export function saveFeedbackDraft(draft: any) {
  memoryDraft = draft;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }
}

export function getFeedbackDraft(): any {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return memoryDraft;
}

export function clearFeedbackDraft() {
  memoryDraft = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }
}
