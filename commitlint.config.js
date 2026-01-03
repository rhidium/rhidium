const config = {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (message) => /^Bumps \[.+]\(.+\) from .+ to .+\.$/m.test(message),
    (message) => message.startsWith('chore(release): '),
  ],
};

export default config;
