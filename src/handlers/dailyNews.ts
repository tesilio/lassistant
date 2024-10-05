import { TelegramBot } from '../TelegramBot';
import { Telegraf } from 'telegraf';
import { DailyNews } from '../DailyNews';
import environment from '../../config/environment';

const telegraf = new Telegraf(environment.telegram.token);
const dailyNews = new DailyNews();
const telegramBot = new TelegramBot(telegraf, dailyNews);

/**
 * dailyNews 핸들러
 * @returns {Promise<{statusCode: number}>}
 */
export const handler = async (): Promise<{
  statusCode: number;
}> => {
  try {
    await telegramBot.sendDailyNews();
  } catch (e) {
    await telegramBot.sendErrorMessage(e, __filename);
  }
  return {
    statusCode: 200,
  };
};
