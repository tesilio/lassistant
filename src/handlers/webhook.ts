import serverlessHttp from 'serverless-http';
import { Handler } from 'aws-lambda';
import { Telegraf } from 'telegraf';
import { Webhook } from '../Webhook';
import { DailyNews } from '../DailyNews';
import environment from '../../config/environment';

const telegraf = new Telegraf(environment.telegram.token);
const dailyNews = new DailyNews();
const webhook = new Webhook(telegraf, dailyNews);

/**
 * 핸들러
 */
export const handler: Handler = serverlessHttp(webhook.webhookCallback());
