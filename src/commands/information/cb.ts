import { Command, PermissionLevels } from "types/command";

const cb: Command = {
  run: async (client, message, args) => {
    try {
      // Are any arguments given?
      if (args.length == 0) {
        return message.channel.send({ embeds: [client.errEmb(1)] });
      }

      if (args.length == 1 || args.length == 2) {
        // Check if it fits the message ID criteria
        const match = args[0].match(/^\d{17,19}$/);

        if (match) {
          // Its a link to a message. Lets find that message!
          const msg = await message.channel.messages.fetch(match[0]);
          let max = 1993;

          if (args.length == 2) {
            // console.log(args[1]);
            max -= args[1].length;
          }

          // make sure code block will fit under 2000 characters
          if (msg.content.length > max) {
            return message.channel.send({
              embeds: [
                client.errEmb(
                  2,
                  `Message too long. Please keep it ${max} characters or fewer`
                ),
              ],
            });
          }

          // sends code block version
          message.channel.send(`code by ${msg.author}:`);

          let messageContent = msg.content.trim();
          let begin;
          for (begin = 0; begin < messageContent.length; begin++) {
            if (messageContent[begin] != "`") {
              break;
            }
          }
          let end;
          for (end = messageContent.length - 1; end >= begin; end--) {
            if (messageContent[end] != "`") {
              break;
            }
          }
          // console.log("begin: ", begin, "end: ", end);
          if (args.length == 1) {
            messageContent = "```\n" + messageContent.substring(begin, end + 1) + "```";
          } else if (args.length == 2) {
            messageContent =
              "```" + args[1] + "\n" + messageContent.substring(begin, end + 1) + "```";
          }

          if (messageContent !== "") {
            message.channel.send(messageContent);
          }
        } else {
          return message.channel.send({
            embeds: [client.errEmb(2, "please provide a valid message ID!")],
          });
        }
      }
    } catch (e) {
      client.log("err", e);
    }
  },
  conf: {
    aliases: ["cb"],
    permLevel: PermissionLevels.USER,
  },
  help: {
    name: "codeblock",
    description: `converts message into code block`,
  },
};

export default cb;
