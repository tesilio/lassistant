import * as TelegramBot from "node-telegram-bot-api";
import environment from '../config/environment';

export class Lassistant {
  private telegramBot: TelegramBot;

  /**
   * 생성자
   */
  constructor() {
    this.telegramBot = new TelegramBot(environment.telegram.token || 'ERROR!');
  }

  /**
   * 메시지 발송
   * @async
   * @param {string} chatId - Chat 아이디
   * @param {string} message - 메시지
   * @returns {Promise<void>}
   */
  async sendMessage(chatId = environment.telegram.chatId || 'ERROR!', message: string) {
    await this.telegramBot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
  }
}
