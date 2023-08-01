process.env.NTBA_FIX_319 = '1';
import * as Telegram from 'node-telegram-bot-api';
import * as querystring from 'querystring';
import { SendMessageOptions } from 'node-telegram-bot-api';


const utils = {
  /**
   * 텔레그램 봇 반환기
   */
  bot: () => {
    return new Telegram(process.env.TELEGRAM_TOKEN || 'ERROR!');
  },

  /**
   * 텔레그램 에러 메세지 센더
   * @param event
   * @param context
   * @param error
   * @returns {Promise<*>}
   */
  errorMessageSender: async (event: any, context: any, error: any) => {
    try {
      const bot = utils.bot();
      const region = process.env.REGION;
      let cloudWatchLogURL = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logEventViewer:group=${context.logGroupName};stream=${context.logStreamName};filter=${querystring.escape(`\'${context.awsRequestId}\'`)}`;
      let options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'CloudWatchLog',
              url: cloudWatchLogURL,
            },
          ]],
        },
      } as SendMessageOptions;

      let messageObject = {
        errorMessage: error.message,
        requestBody: JSON.parse(event.body),
      };

      let text = `
Bot Error!
\`\`\`
${JSON.stringify(messageObject, null, 2)}
\`\`\`
        `;
      return await bot.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID || 'ERROR!', text, options);
    } catch (e) {
      console.error(`errorMessageSender Error: ${e}`);
      throw e;
    }

  },
};

export = utils;
