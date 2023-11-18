import * as _ from 'lodash';
import environment from '../config/environment';
import { Telegraf } from 'telegraf';
import * as tt from 'telegraf/src/telegram-types';
import { DailyNews } from './DailyNews';
import {
  Webhook
} from './Webhook';

export class TelegramBot {
  private static telegramBot: TelegramBot;
  private static telegraf: Telegraf;

  /**
   * 생성자
   */
  private constructor() {
    if (_.isEmpty(TelegramBot.telegraf) === true) {
      TelegramBot.telegraf = new Telegraf(environment.telegram.token);
    }
  }

  static getInstance() {
    if (_.isEmpty(TelegramBot.telegramBot) === true) {
      TelegramBot.telegramBot = new TelegramBot();
    }
    return TelegramBot.telegramBot;
  }

  static getTelegraf() {
    if (_.isEmpty(TelegramBot.telegraf) === true) {
      TelegramBot.telegraf = new Telegraf(environment.telegram.token);
    }
    return TelegramBot.telegraf;
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
    chatId: string,
    message: string,
    options: tt.ExtraReplyMessage = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    },
  ): Promise<void> {
    await TelegramBot.telegraf.telegram.sendMessage(chatId, message, options);
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
    await this.sendMessage(environment.telegram.ownerChatId, text);
  }

  /**
   * 뉴스 발송
   * @returns {Promise<void>}
   */
  async sendDailyNews(): Promise<void> {
    const dailyNews = new DailyNews();
    const message = await dailyNews.getDailyNews();
    await this.sendMessage(environment.telegram.chatId, message);
  }

  /**
   * 웹훅 객체 반환
   * @returns {Webhook}
   */
  getWebhook(): Webhook {
    return Webhook.getInstance(TelegramBot.getTelegraf());
  }
}
