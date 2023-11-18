import * as http from 'serverless-http';
import { TelegramBot } from '../TelegramBot';

const telegramBot = TelegramBot.getInstance();
telegramBot.getWebhook();

/**
 * 핸들러
 * @type {http.Handler}
 */
export const handler: http.Handler = http(TelegramBot.getTelegraf().webhookCallback());
