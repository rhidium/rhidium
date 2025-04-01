if (
  process.env.NODE_ENV === 'production' ||
  process.env.CI === 'true' ||
  process.env.HUSKY === '0'
) {
  process.exit(0);
}

const logger = console;
const husky = (await import('husky')).default;
logger.info(husky());