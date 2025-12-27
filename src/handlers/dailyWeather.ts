import { TelegramBot } from '../TelegramBot';
import { Telegraf } from 'telegraf';
import { DailyNews } from '../DailyNews';
import environment from '../../config/environment';
import { logger } from '../infrastructure/logger';

const telegraf = new Telegraf(environment.telegram.token);
const dailyNews = new DailyNews();
const telegramBot = new TelegramBot(telegraf, dailyNews);

export const handler = async (): Promise<{
  statusCode: number;
}> => {
  try {
    logger.info('dailyWeather 핸들러 시작');
    await telegramBot.sendDailyWeather();
    logger.info('dailyWeather 핸들러 완료');
    return { statusCode: 200 };
  } catch (error) {
    logger.error('dailyWeather 핸들러 실패', error);
    await telegramBot.sendErrorMessage(error, __filename);
    return { statusCode: 500 };
  }
};
