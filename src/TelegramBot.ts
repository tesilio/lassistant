import environment from '../config/environment';
import { Telegraf } from 'telegraf';
import * as tt from 'telegraf/src/telegram-types';
import { DailyNews } from './DailyNews';

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
   * @param {tt.ExtraReplyMessage} options - 메시지 옵션
   * @returns {Promise<void>}
   */
  async sendMessage(
    chatId: string,
    message: string,
    options: tt.ExtraReplyMessage = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
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
    const message = await this.dailyNews.getDailyNews();
    await this.sendMessage(environment.telegram.chatId, message);
  }
}
