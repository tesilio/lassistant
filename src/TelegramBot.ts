import environment from '../config/environment';
import { Telegraf } from 'telegraf';
import { DailyNews } from './DailyNews';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import * as dayjs from 'dayjs';
import { PREFIX_REDIS_KEY } from './constant';
import Redis from './Redis';

export class TelegramBot {
  private telegraf: Telegraf;
  private dailyNews: DailyNews;

  /**
   * TelegramBot 클래스의 생성자입니다.
   * @param {Telegraf} telegraf - Telegraf 인스턴스
   * @param {DailyNews} dailyNews - DailyNews 인스턴스
   */
  constructor(telegraf: Telegraf, dailyNews: DailyNews) {
    this.telegraf = telegraf;
    this.dailyNews = dailyNews;
  }

  /**
   * 주어진 채팅 ID에 메시지를 보냅니다.
   * @param {string} chatId - 메시지를 보낼 채팅 ID
   * @param {string} message - 보낼 메시지
   * @param {ExtraReplyMessage} options - 메시지 옵션
   * @returns {Promise<void>}
   */
  async sendMessage(
    chatId: string,
    message: string,
    options: ExtraReplyMessage = {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: true,
      },
    },
  ): Promise<void> {
    await this.telegraf.telegram.sendMessage(chatId, message, options);
  }

  /**
   * 에러 메시지를 보냅니다.
   * @param {any} error - 보낼 에러
   * @param {string} path - 에러가 발생한 파일 경로
   * @returns {Promise<void>}
   */
  async sendErrorMessage(error: any, path: string = __filename): Promise<void> {
    console.error(`${path}: ${error}`);
    const text = `
Bot Error!
\`\`\`
${error}
\`\`\`
`;
    await this.sendMessage(environment.telegram.ownerChatId, text);
  }

  /**
   * 일일 뉴스를 보냅니다.
   * @returns {Promise<void>}
   */
  async sendDailyNews(): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const messageKey = `${PREFIX_REDIS_KEY}:dailyNews:${today}`;
    let message = await Redis.getInstance().get(messageKey);

    if (message === null) {
      message = await this.dailyNews.getDailyNews();
      await Redis.getInstance().set(messageKey, message, 600);
    }
    await this.sendMessage(environment.telegram.chatId, message);
  }
}
