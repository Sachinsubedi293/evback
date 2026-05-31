/**
 * PM2 Ecosystem Configuration for Multi-vCPU Scaling
 *
 * ├── REDIS_URL is set → Cross-process SSE events via Redis Pub/Sub
 * ├── REDIS_URL is not set → Each PM2 process handles its own clients independently
 * │                           (students won't see events from other processes)
 *
 * REQUIREMENTS:
 *   - Install PM2 globally: npm install -g pm2
 *   - (Optional) Set REDIS_URL in .env for cross-process SSE sync
 *
 * USAGE:
 *   pm2 start ecosystem.config.cjs         # Start all instances
 *   pm2 start ecosystem.config.cjs -i max  # Auto-detect vCPU count
 *   pm2 list                                # View status
 *   pm2 logs                                # View logs
 *   pm2 reload ecosystem.config.cjs         # Zero-downtime reload
 *   pm2 delete all                          # Stop everything
 *
 * MONITORING:
 *   pm2 monit            # Real-time CPU/RAM per process
 *   pm2 status           # Process health
 */

module.exports = {
  apps: [
    {
      name: "evback",
      script: "src/index.js",
      instances: "max", // Spawns one instance per vCPU (auto-detected)
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
        watch: true,
        ignore_watch: ["node_modules", "logs"],
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_restarts: 5,
      restart_delay: 3000,
    },
  ],
};