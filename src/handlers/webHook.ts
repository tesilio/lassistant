import { TelegramBot } from '../TelegramBot';
import * as http from 'serverless-http';
import { message } from 'telegraf/filters';

const telegraf = TelegramBot.getTelegraf();

telegraf.on(message('text'), async (ctx) => {
  const text = ctx.message.text;
  await ctx.reply(text);
});

/**
 * 핸들러
 * @type {http.Handler}
 */
export const handler: http.Handler = http(telegraf.webhookCallback());
