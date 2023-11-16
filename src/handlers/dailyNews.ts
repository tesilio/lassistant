import { TelegramBot } from '../TelegramBot';

/**
 * dailyNews 핸들러
 * @returns {Promise<{statusCode: number}>}
 */
export const handler = async (): Promise<{
  statusCode: number;
}> => {
  const telegramBot = TelegramBot.getInstance();
  try {
    await telegramBot.sendDailyNews();
  } catch (e) {
    console.error(`Final Catch in ${__filename}:`, e);
    await telegramBot.sendErrorMessage(e);
  }
  return {
    statusCode: 200,
  };
};
