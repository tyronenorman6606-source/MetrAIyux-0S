module.exports = {
  apps: [
    {
      name: 'skye-content-forge',
      script: 'server.js',
      cwd: __dirname + '/..',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PROCESS_MANAGER: 'pm2',
        PUBLISHER_AUTORUN: '1',
        PUBLISHER_POLL_SECONDS: '300'
      },
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true
    }
  ]
};
