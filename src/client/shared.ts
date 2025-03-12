import 'dotenv/config';
import './module-aliases';

import { logger, init as initLang } from '@core';
import { appConfig } from './config';

/**
 * This file is used to initialize any shared code -
 * code that should be executed both when spawning a cluster,
 * and when starting the client/bot normally.
 *
 * Importing this file as early as possible is crucial,
 * as it will initialize our config and language localization
 * across the entire application and all shared processes.
 */

// Instantiate our singleton config as early as possible
// used in initLang, would otherwise need unused variable

// Initialize our language localization
void initLang(appConfig.debug.localizations);

// Error handling / keep alive ONLY in development. You shouldn't have any
// unhandledRejection or uncaughtException errors in production
// as these should be addressed in development
if (process.env.NODE_ENV !== 'production') {
  process.on('unhandledRejection', (reason, promise) => {
    logger._error(
      'Encountered unhandledRejection error (catch):',
      reason,
      promise,
    );
  });
  process.on('uncaughtException', (err, origin) => {
    logger._error('Encountered uncaughtException error:', err, origin);
  });
}
