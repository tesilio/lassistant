import environment from '../config/environment';
import { Telegraf } from 'telegraf';
import { DailyNews } from './DailyNews';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { logger } from './infrastructure/logger';

export class TelegramBot {
  private telegraf: Telegraf;
  private dailyNews: DailyNews;

  constructor(telegraf: Telegraf, dailyNews: DailyNews) {
    this.telegraf = telegraf;
    this.dailyNews = dailyNews;
  }

  async sendMessage(
    chatId: string,
    message: string,
    options: ExtraReplyMessage = {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    },
  ): Promise<void> {
    await this.telegraf.telegram.sendMessage(chatId, message, options);
  }

  async sendMessages(
    chatId: string,
    messages: string[],
    options: ExtraReplyMessage = {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    },
  ): Promise<void> {
    for (const message of messages) {
      await this.sendMessage(chatId, message, options);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async sendErrorMessage(error: unknown, path: string = __filename): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Bot error', error, { path });
    const text = `
Bot Error!
\`\`\`
${errorMessage}
\`\`\`
`;
    await this.sendMessage(environment.telegram.ownerChatId, text);
  }

  async sendDailyNews(): Promise<void> {
    const messages = await this.dailyNews.getDailyNews();
    await this.sendMessages(environment.telegram.chatId, messages);
  }

  async sendDailyWeather(): Promise<void> {
    const { DailyWeather } = await import('./DailyWeather');
    const dailyWeather = new DailyWeather();
    const messages = await dailyWeather.getDailyWeather();
    await this.sendMessages(environment.telegram.chatId, messages);
  }
}
