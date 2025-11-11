import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}

interface LoggerOptions {
  prefix?: string;
  showTimestamp?: boolean;
  minLevel?: LogLevel;
}

class Logger {
  private prefix: string;
  private showTimestamp: boolean;
  private minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || "";
    this.showTimestamp = options.showTimestamp ?? true;
    this.minLevel = options.minLevel ?? LogLevel.DEBUG;
  }

  private getTimestamp(): string {
    if (!this.showTimestamp) return "";
    const now = new Date();
    const time = now.toLocaleTimeString("zh-CN", { hour12: false });
    return chalk.gray(`[${time}]`);
  }

  private getPrefix(): string {
    return this.prefix ? chalk.cyan(`[${this.prefix}]`) : "";
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.shouldLog(level)) return;

    const timestamp = this.getTimestamp();
    const prefix = this.getPrefix();
    const parts = [timestamp, prefix].filter(Boolean);

    let levelTag = "";
    let coloredMessage = message;

    switch (level) {
      case LogLevel.DEBUG:
        levelTag = chalk.magenta("[DEBUG]");
        coloredMessage = chalk.magenta(message);
        break;
      case LogLevel.INFO:
        levelTag = chalk.blue("[INFO]");
        coloredMessage = chalk.blue(message);
        break;
      case LogLevel.WARN:
        levelTag = chalk.yellow("[WARN]");
        coloredMessage = chalk.yellow(message);
        break;
      case LogLevel.ERROR:
        levelTag = chalk.red("[ERROR]");
        coloredMessage = chalk.red(message);
        break;
      case LogLevel.SUCCESS:
        levelTag = chalk.green("[SUCCESS]");
        coloredMessage = chalk.green(message);
        break;
    }

    parts.push(levelTag);
    console.log(parts.join(" "), coloredMessage, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.formatMessage(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.formatMessage(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.formatMessage(LogLevel.ERROR, message, ...args);
  }

  success(message: string, ...args: any[]): void {
    this.formatMessage(LogLevel.SUCCESS, message, ...args);
  }

  // 创建带有新前缀的子 logger
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({
      prefix: childPrefix,
      showTimestamp: this.showTimestamp,
      minLevel: this.minLevel,
    });
  }

  // 分隔线
  divider(char = "-", length = 50): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  // 高亮显示
  highlight(message: string, ...args: any[]): void {
    console.log(chalk.bgCyan.black(` ${message} `), ...args);
  }

  // 表格式输出
  table(data: Record<string, any>): void {
    const timestamp = this.getTimestamp();
    const prefix = this.getPrefix();
    const parts = [timestamp, prefix].filter(Boolean);

    if (parts.length > 0) console.log(parts.join(" "));

    Object.entries(data).forEach(([key, value]) => {
      console.log(
        `  ${chalk.cyan(key.padEnd(20, " "))} ${chalk.white(
          ":"
        )} ${chalk.yellow(String(value))}`
      );
    });
  }
}

export const logger = new Logger({
  prefix: "[logger]: ",
});
export { Logger };
