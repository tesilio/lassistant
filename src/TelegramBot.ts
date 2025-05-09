import environment from '../config/environment';
import { Telegraf } from 'telegraf';
import { DailyNews } from './DailyNews';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

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
   * 여러 메시지를 순차적으로 보냅니다.
   * @param {string} chatId - 메시지를 보낼 채팅 ID
   * @param {Array<string>} messages - 보낼 메시지 배열
   * @param {ExtraReplyMessage} options - 메시지 옵션
   * @returns {Promise<void>}
   */
  async sendMessages(
    chatId: string,
    messages: Array<string>,
    options: ExtraReplyMessage = {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: true,
      },
    },
  ): Promise<void> {
    for (const message of messages) {
      await this.sendMessage(chatId, message, options);
      // 텔레그램 API 제한 방지를 위한 짧은 지연
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
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
    const messages = await this.dailyNews.getDailyNews();
    await this.sendMessages(environment.telegram.chatId, messages);
  }
}
