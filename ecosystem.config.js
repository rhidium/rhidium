module.exports = {
  apps: [
    {
      name: 'rhidium',
      script: './dist/index.js',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
