import environment from '../config/environment';
import { Telegraf } from 'telegraf';
import * as tt from 'telegraf/src/telegram-types';

export class Lassistant {
  private telegramBot: Telegraf;

  /**
   * 생성자
   */
  constructor() {
    this.telegramBot = new Telegraf(environment.telegram.token || 'ERROR!');
  }

  /**
   * 메시지 발송
   * @async
   * @param {string} chatId - Chat 아이디
   * @param {string} message - 메시지
   * @param {ExtraReplyMessage} options - 옵션
   * @returns {Promise<void>}
   */
  async sendMessage(
    chatId: string = environment.telegram.chatId || 'ERROR!',
    message: string,
    options: tt.ExtraReplyMessage = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    },
  ): Promise<void> {
    await this.telegramBot.telegram.sendMessage(chatId, message, options);
  }

  /**
   * 에러 메시지 발송
   * @param error - 에러 객체
   * @returns {Promise<void>}
   */
  async sendErrorMessage(error: any): Promise<void> {
    const text = `
Bot Error!
\`\`\`
${error}
\`\`\`
`;
    await this.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID, text);
  }
}
