export default {
  region: process.env.REGION,
  telegram: {
    token: process.env.TELEGRAM_TOKEN as string,
    chatId: process.env.TELEGRAM_CHAT_ID as string,
    ownerChatId: process.env.TELEGRAM_OWNER_CHAT_ID as string,
    botName: process.env.TELEGRAM_BOT_NAME as string,
  },
  redis: {
    host: process.env.REDIS_HOST as string,
    port: parseInt(process.env.REDIS_PORT as string),
    password: process.env.REDIS_PASSWORD as string,
  },
};
