import {
  TelegramBot,
} from '../TelegramBot';
import * as http from 'serverless-http';
import { message } from 'telegraf/filters';
const telegraf = TelegramBot.getTelegraf();

telegraf.on(message('text'), async (ctx) => {
  await ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`)
})

/**
 * 핸들러
 * @type {ServerlessHttp.Handler}
 */
export const handler = http(telegraf.webhookCallback('/telegraf'));
