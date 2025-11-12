module.exports = {
  apps: [
    {
      name: "qqbot", // 你的应用名称（比如 QQ 机器人，可自定义）
      script: "index.mjs", // 你的机器人启动脚本（如 index.js，根据实际路径修改）
      // 核心：每 30 分钟重启一次（cron 表达式）
      cron_restart: "*/30 * * * *",
      // 优化配置（避免重启时丢消息/误判，推荐必加）
      restart_delay: 5000, // 重启前延迟 5 秒（让机器人优雅关闭连接、保存状态）
      cron_restart_no_ping: true, // 禁用重启时的 PM2 健康检查（避免误判服务不可用）
      max_memory_restart: "512M", // 额外优化：内存超 512M 也自动重启（可选，根据机器人内存占用调整）
      merge_logs: true, // 合并历史日志（避免日志文件过多）
      log_date_format: "YYYY-MM-DD HH:mm:ss", // 日志时间戳格式（方便排查）
    },
  ],
};
