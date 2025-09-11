import chalk from 'chalk';
const theme = chalk.hex('#c674d2');

export const logger = {
    // Log informational messages in custom purple color
    info: (message) => console.log(theme(message)),

    // Log warning messages in yellow color
    warn: (message) => console.log(chalk.yellow(message)),

    // Log error messages in red color
    error: (message) => console.log(chalk.red(message)),

    // Log success messages in green color
    success: (message) => console.log(chalk.green(message)),

    // Log debug messages in gray color (for development/troubleshooting)
    debug: (message) => console.log(chalk.gray(message))
};