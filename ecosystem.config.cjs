module.exports = {
  apps: [
    {
      name: 'ems',
      script: 'dist/index.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // pm2 will read environment variables from the actual environment
      // so you should set SESSION_SECRET externally (or use a .env loader in production)
    },
  ],
};
module.exports = {
  apps: [
    {
      name: 'ems',
      script: 'dist/index.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // pm2 will read environment variables from the actual environment
      // so you should set SESSION_SECRET externally (or use a .env loader in production)
    },
  ],
};
