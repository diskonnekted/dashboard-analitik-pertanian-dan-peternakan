// PM2 ecosystem SISPERTANI API (produksi CloudPanel, node site self-managed).
// Jalankan dari Application Root: pm2 start ecosystem.config.cjs
// Kredensial tetap dibaca dari .env (node_args --env-file), bukan di sini.
module.exports = {
  apps: [
    {
      name: "sispertani-api",
      script: "src/server.js",
      node_args: "--env-file=.env",
      max_memory_restart: "512M",
      out_file: "./logs-pm2/out.log",
      error_file: "./logs-pm2/error.log",
      time: true,
    },
  ],
};
