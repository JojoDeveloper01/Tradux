import chalk from 'chalk';
const theme = chalk.hex('#c674d2');

export const logger = {
    info: (message) => console.log(theme(message)),
    warn: (message) => console.log(chalk.yellow(message)),
    error: (message) => console.log(chalk.red(message)),
    success: (message) => console.log(chalk.green(message)),
    debug: (message) => console.log(chalk.gray(message))
};