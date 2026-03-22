import { config } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// IPC sender — injected by main process
let ipcSender: ((channel: string, ...args: unknown[]) => void) | null = null;

export function setIpcSender(sender: (channel: string, ...args: unknown[]) => void): void {
  ipcSender = sender;
}

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

function shouldLog(level: LogLevel): boolean {
  const configLevel = (config.logLevel as LogLevel) ?? 'info';
  return LEVELS[level] >= LEVELS[configLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] [${context}]`;
  let dataStr = '';
  if (data !== undefined) {
    if (data instanceof Error) {
      dataStr = ` | ${data.message} ${data.stack || ''}`;
    } else if (typeof data === 'object') {
      try { dataStr = ` | ${JSON.stringify(data)}`; } catch { dataStr = ` | [Objeto Complexo]`; }
    } else {
      dataStr = ` | ${String(data)}`;
    }
  }
  const fullMessage = `${prefix} ${message}${dataStr}`;

  // Console output with color
  const color = COLORS[level];
  console.log(`${color}${fullMessage}${RESET}`);

  // Send to renderer via IPC
  if (ipcSender) {
    try {
      ipcSender('log-entry', { level, context, message, data, timestamp });
    } catch {
      // IPC might not be ready yet
    }
  }
}

export const logger = {
  debug: (context: string, message: string, data?: unknown) => log('debug', context, message, data),
  info: (context: string, message: string, data?: unknown) => log('info', context, message, data),
  warn: (context: string, message: string, data?: unknown) => log('warn', context, message, data),
  error: (context: string, message: string, data?: unknown) => log('error', context, message, data),
};

export default logger;
