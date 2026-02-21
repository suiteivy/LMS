import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clipboard } from 'react-native';

const LOG_STORAGE_KEY = '@app_debug_logs';
const MAX_LOGS = 200;

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private isInitialized = false;
  private pendingLogs: LogEntry[] = [];
  private initPromise: Promise<void> | null = null;

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const storedLogs = await AsyncStorage.getItem(LOG_STORAGE_KEY);
        if (storedLogs) {
          const parsed = JSON.parse(storedLogs);
          // Prepend any logs that happened while we were loading
          this.logs = [...this.pendingLogs, ...parsed];
          this.pendingLogs = [];
        } else {
          this.logs = [...this.pendingLogs];
          this.pendingLogs = [];
        }
        this.isInitialized = true;
        this.info('LoggingService initialized and synchronized');
      } catch (e) {
        console.error('Failed to initialize LoggingService:', e);
      }
    })();

    return this.initPromise;
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to persist logs:', e);
    }
  }

  private addLog(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details, null, 2)) : undefined,
    };

    // Print to console
    const consoleMsg = `[LOG] ${message}`;
    if (level === 'error' || level === 'fatal') console.error(consoleMsg, details || '');
    else if (level === 'warn') console.warn(consoleMsg, details || '');
    else console.log(consoleMsg);

    if (!this.isInitialized) {
      this.pendingLogs.unshift(entry);
      return;
    }

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    
    this.persist();
  }

  info(message: string, details?: any) {
    this.addLog('info', message, details);
  }

  warn(message: string, details?: any) {
    this.addLog('warn', message, details);
  }

  error(message: string, details?: any) {
    this.addLog('error', message, details);
  }

  fatal(message: string, details?: any) {
    this.addLog('fatal', message, details);
  }

  getLogs(): LogEntry[] {
    return this.isInitialized ? this.logs : this.pendingLogs;
  }

  copyToClipboard() {
    const logString = this.getLogs()
      .map(l => `[${l.level.toUpperCase()}] ${l.timestamp}\n${l.message}${l.details ? '\n' + l.details : ''}`)
      .join('\n\n---\n\n');
    Clipboard.setString(logString);
  }

  async clearLogs() {
    this.logs = [];
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
    this.info('Logs cleared');
  }
}

export const logger = new LoggingService();
