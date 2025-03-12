module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --ignore-unknown --write'],
  '*.{md,json,yaml,html,css,!pnpm-lock.yaml}': 'prettier --write',
};
