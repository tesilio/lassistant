import { TelegramBot } from '../TelegramBot';
import * as http from 'serverless-http';
import { message } from 'telegraf/filters';

const telegraf = TelegramBot.getTelegraf();

telegraf.on(message('text'), (ctx) => ctx.reply('Hello'));

/**
 * 핸들러
 * @type {ServerlessHttp.Handler}
 */
export const handler = http(telegraf.webhookCallback());
