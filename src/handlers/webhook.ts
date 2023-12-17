import * as http from 'serverless-http';
import { Telegraf } from 'telegraf';
import { Webhook } from '../Webhook';
import { DailyNews } from '../DailyNews';
import environment from '../../config/environment';

const telegraf = new Telegraf(environment.telegram.token);
const dailyNews = new DailyNews();
const webhook = new Webhook(telegraf, dailyNews);

/**
 * 핸들러
 * @type {http.Handler}
 */
export const handler: http.Handler = http(webhook.webhookCallback());
