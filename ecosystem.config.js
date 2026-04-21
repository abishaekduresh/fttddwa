module.exports = {
  apps: [
    {
      name: "fttddwa-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        APP_ENV: "production",
        PORT: 3000
      },
      env_production: {
        APP_ENV: "production"
      }
    },
    {
      name: "fttddwa-worker",
      script: "dist/worker/worker.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        APP_ENV: "production"
      },
      env_production: {
        APP_ENV: "production"
      }
    }
  ]
};
