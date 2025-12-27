type LogMeta = Record<string, unknown>;

const formatLog = (level: string, message: string, meta?: LogMeta): string => {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: process.env.AWS_REQUEST_ID,
    ...meta,
  });
};

export const logger = {
  info: (message: string, meta?: LogMeta): void => {
    console.log(formatLog('INFO', message, meta));
  },

  warn: (message: string, meta?: LogMeta): void => {
    console.warn(formatLog('WARN', message, meta));
  },

  error: (message: string, error?: unknown, meta?: LogMeta): void => {
    console.error(
      formatLog('ERROR', message, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...meta,
      }),
    );
  },

  debug: (message: string, meta?: LogMeta): void => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(formatLog('DEBUG', message, meta));
    }
  },
};
