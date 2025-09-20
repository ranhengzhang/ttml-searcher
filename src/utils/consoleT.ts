import chalk from "chalk";

export const logPrimary = (...message: any[]) => console.log(chalk.bgHex("#409EFF").hex("#FFFFFF")(...message))
export const logSuccess = (...message: any[]) => console.log(chalk.bgHex("#67C23A").hex("#FFFFFF")(" success "), ...message)
export const logWarning = (...message: any[]) => console.log(chalk.bgHex("#E6A23C").hex("#FFFFFF")(" warning "), ...message)
export const logDanger = (...message: any[]) => console.log(chalk.bgHex("#F56C6C").hex("#FFFFFF")(" danger "), ...message)
export const logInfo = (...message: any[]) => console.log(chalk.bgHex("#909399").hex("#FFFFFF")(" info "), ...message)