import { Lassistant } from '../Lassistant';

/**
 * dailyNews 핸들러
 * @returns {Promise<{statusCode: number}>}
 */
exports.handler = async (): Promise<{
  statusCode: number;
}> => {
  const lassistant = new Lassistant();
  try {
    await lassistant.sendDailyNews();
  } catch (e) {
    console.error(`Final Catch in ${__filename}:`, e);
    await lassistant.sendErrorMessage(e);
  }
  return {
    statusCode: 200,
  };
};
