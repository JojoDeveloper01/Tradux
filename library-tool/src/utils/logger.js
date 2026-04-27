/** Colored console logger used across the CLI. */
import chalk from "chalk";

export const color = {
  primary: chalk.hex("#c674d2"),
  secondary: chalk.hex("#cb94d4"),
  tertiary: chalk.hex("#8f7aa2"),
  dim: chalk.dim,
  warn: chalk.yellow,
  error: chalk.red,
  success: chalk.green,
};

export const logger = {
  info: (message) => console.log(color.primary(message)),
  info2: (message) => console.log(color.secondary(message)),
  info3: (message) => console.log(color.tertiary(message)),
  warn: (message) => console.log(color.warn(message)),
  error: (message) => console.log(color.error(message)),
  success: (message) => console.log(color.success(message)),
  dim: (message) => console.log(color.dim(message)),
};
