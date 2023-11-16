import { TelegramBot } from '../TelegramBot';
import * as http from 'serverless-http';
import { message } from 'telegraf/filters';
import {
  Telegraf
} from 'telegraf';

const telegraf = TelegramBot.getTelegraf();

// info: on 이벤트가 맨 밑으로 가야 할 듯
telegraf.help((ctx) => ctx.reply('Send me a sticker'))
telegraf.command('oldschool', (ctx) => ctx.reply('Hello'));
telegraf.command('hipster', Telegraf.reply('λ');
telegraf.on(message('sticker'), (ctx) => ctx.reply('👍'))
telegraf.on(message('text'), async (ctx) => {
  const text = ctx.message.text;
  await ctx.reply(text);
});


/**
 * 핸들러
 * @type {http.Handler}
 */
export const handler: http.Handler = http(telegraf.webhookCallback());
