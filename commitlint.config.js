const config = {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (message) => /^Bumps \[.+]\(.+\) from .+ to .+\.$/m.test(message),
    (message) => message.startsWith('chore(release): '),
    (message) => message.startsWith('Merge commit '),
    (message) => message.includes('[skip ci]') || message.includes('[ci skip]'),
  ],
};

export default config;
