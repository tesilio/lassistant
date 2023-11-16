import { Telegraf } from 'telegraf';
import environment from '../config/environment';

const utils = {
  /**
   * 텔레그램 봇 반환기
   */
  bot: () => {
    return new Telegraf(environment.telegram.token);
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
      const cloudWatchLogURL = new URL(
        `https://${environment.region}.console.aws.amazon.com/cloudwatch/home?region=${environment.region}#logEventViewer:group=${context.logGroupName};stream=${context.logStreamName};filter='${context.awsRequestId}'`,
      );


      const messageObject = {
        errorMessage: error.message,
        requestBody: event.body ? JSON.parse(event.body) : undefined,
      };

      const text = `
Bot Error!
\`\`\`
${JSON.stringify(messageObject, null, 2)}
\`\`\`
`;
      return await bot.telegram.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID || 'ERROR!', text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'CloudWatchLog',
                url: cloudWatchLogURL.href,
              },
            ],
          ],
        }
      });
    } catch (e) {
      console.error(`errorMessageSender Error: ${e}`);
      throw e;
    }
  },
};

export = utils;
