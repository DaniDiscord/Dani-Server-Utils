import chalk from "chalk";
import { format } from "util";
export class Logger {
  private static get timestamp(): string {
    const now = new Date();
    const [year, month, day] = now.toISOString().substring(0, 10).split("-");
    return `${day}/${month}/${year} @ ${now.toISOString().substring(11, 8)}`;
  }

  public info(...args: string | any): void {
    console.log(
      chalk.bold(
        chalk.bgGreenBright(chalk.blackBright(`[${Logger.timestamp}]`))
      ),
      chalk.bold(format(...args))
    );
  }

  public warn(...args: any) {
    console.log(
      chalk.bold(
        chalk.bgYellowBright(chalk.blackBright(`[${Logger.timestamp}]`))
      ),
      chalk.bold(format(...args))
    );
  }

  public error(error: any | null, ...args: any): void {
    if (error)
      console.log(
        chalk.bold(chalk.bgRedBright(`[${Logger.timestamp}]`)),
        error,
        chalk.bold(format(...args))
      );
    else
      console.log(
        chalk.bold(chalk.bgRedBright(`[${Logger.timestamp}]`)),
        chalk.bold(format(...args))
      );
  }
}
