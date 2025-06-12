import { TelegramBot } from '../TelegramBot';
import { Telegraf } from 'telegraf';
import { DailyNews } from '../DailyNews';
import environment from '../../config/environment';

const telegraf = new Telegraf(environment.telegram.token);
const dailyNews = new DailyNews();
const telegramBot = new TelegramBot(telegraf, dailyNews);

/**
 * dailyNews 핸들러 - MongoDB 연결을 보장한 후 실행
 * @returns {Promise<{statusCode: number}>}
 */
export const handler = async (): Promise<{
  statusCode: number;
}> => {
  // Lambda 함수 시작 시 MongoDB 연결 보장
  try {
    //    await ensureMongoConnection();
  } catch (error) {
    await telegramBot.sendErrorMessage(error, __filename);
  }

  try {
    await telegramBot.sendDailyNews();
  } catch (e) {
    await telegramBot.sendErrorMessage(e, __filename);
  }
  return {
    statusCode: 200,
  };
};
