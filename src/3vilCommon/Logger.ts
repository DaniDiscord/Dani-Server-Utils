import colors from "colors";
import dayjs from "dayjs";
import fs from "fs";
import log from "gelf-pro";
import path from "path";

const gelfConfig: Partial<log.Settings> = {
  fields: { facility: "Dani Server Utils", log_version: "1" },
  adapterName: "tcp-tls",
  transform: [
    (message) => {
      // We don't want messages to have >20 short_message length
      if (message.short_message?.length > 20) {
        message.short_message_full = message.short_message;
        message.short_message = [message.short_message.substr(0, 17), "..."].join("");
      }
      message.full_message = message.message;
    },
  ],
  broadcast: [
    (message) => {
      // Broadcasting to console

      // Delete short_message from log since it's already logged

      const date = colors.blue.bold(dayjs().format("D/M HH:mm:ss.SSS"));

      // Action is easily extendible with custom repo-specific actions
      let action;
      switch (message.action) {
        case "Load":
          action = colors.green.bold(message.action);
          break;
        default:
          action = colors.magenta.bold(message.action);
      }

      let shortMessage;
      // ShortMessage also easily extendible
      switch (message.short_message) {
        default:
          shortMessage = colors.yellow(message.short_message);
      }

      console[message.level > 3 ? "log" : "error"](
        `[${date}] [${action}] [${shortMessage}] ${message.message}`
      );
    },
  ],
};

if (
  process.env.GRAYLOG_KEY_PATH &&
  fs.existsSync(
    path.resolve(__dirname, path.join("../..", process.env.GRAYLOG_KEY_PATH as string))
  ) &&
  process.env.GRAYLOG_CERT_PATH &&
  fs.existsSync(
    path.resolve(__dirname, path.join("../..", process.env.GRAYLOG_CERT_PATH as string))
  ) &&
  process.env.GRAYLOG_HOST
) {
  console.log("Loading graylog certs");
  gelfConfig.adapterOptions = {
    host: process.env.GRAYLOG_HOST,
    key: fs.readFileSync(process.env.GRAYLOG_KEY_PATH, { encoding: "utf8" }),
    cert: fs.readFileSync(process.env.GRAYLOG_CERT_PATH, { encoding: "utf8" }),
  };
}

log.setConfig(gelfConfig);

global.log = log;
