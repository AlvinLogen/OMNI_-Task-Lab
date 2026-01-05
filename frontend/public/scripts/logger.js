// Frontend Logger Utility
(function() {
    const LOG_LEVELS = {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    };

    const LOG_ENDPOINT = '/api/logs/frontend';

    class FrontendLogger {
        constructor() {
            this.isProduction = window.location.hostname !== 'localhost';
            this.queue = [];
            this.isSending = false;
            
            // Batch send logs every 5 seconds
            setInterval(() => this.flushQueue(), 5000);

            // Capture unhandled errors
            this.setupErrorHandlers();
        }

        setupErrorHandlers() {
            // Capture JavaScript errors
            window.addEventListener('error', (event) => {
                this.error('Uncaught Error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                });
            });

            // Capture promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.error('Unhandled Promise Rejection', {
                    reason: event.reason,
                    promise: event.promise
                });
            });
        }

        log(level, message, meta = {}) {
            // Always log to console in development
            if (!this.isProduction) {
                const consoleFn = console[level] || console.log;
                consoleFn(`[${level.toUpperCase()}]`, message, meta);
            }

            // Add to queue for server logging
            this.queue.push({
                level,
                message,
                meta: {
                    ...meta,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            });

            // Send immediately for errors
            if (level === LOG_LEVELS.ERROR) {
                this.flushQueue();
            }
        }

        error(message, meta = {}) {
            this.log(LOG_LEVELS.ERROR, message, meta);
        }

        warn(message, meta = {}) {
            this.log(LOG_LEVELS.WARN, message, meta);
        }

        info(message, meta = {}) {
            this.log(LOG_LEVELS.INFO, message, meta);
        }

        debug(message, meta = {}) {
            this.log(LOG_LEVELS.DEBUG, message, meta);
        }

        async flushQueue() {
            if (this.isSending || this.queue.length === 0) {
                return;
            }

            this.isSending = true;
            const logsToSend = [...this.queue];
            this.queue = [];

            try {
                // Send logs to backend
                for (const logEntry of logsToSend) {
                    await fetch(LOG_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(logEntry)
                    });
                }
            } catch (error) {
                // If sending fails, add back to queue (up to 100 logs)
                this.queue = [...logsToSend, ...this.queue].slice(0, 100);
                
                // Only log to console if not in production
                if (!this.isProduction) {
                    console.error('Failed to send logs to server:', error);
                }
            } finally {
                this.isSending = false;
            }
        }

        // Manual flush for critical situations
        forceFlush() {
            return this.flushQueue();
        }
    }

    // Create global logger instance
    window.logger = new FrontendLogger();

    // Log page load
    window.logger.info('Page loaded', {
        referrer: document.referrer,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
    });

    // Log when user leaves page
    window.addEventListener('beforeunload', () => {
        window.logger.info('Page unload');
        // Synchronous final flush if possible
        if (navigator.sendBeacon && window.logger.queue.length > 0) {
            const blob = new Blob([JSON.stringify(window.logger.queue)], {
                type: 'application/json'
            });
            navigator.sendBeacon(LOG_ENDPOINT + '/batch', blob);
        }
    });
})();
