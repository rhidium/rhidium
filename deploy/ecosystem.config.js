module.exports = {
  apps: [
    {
      name: 'rhidium',
      script: './dist/src/client/index.js',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
