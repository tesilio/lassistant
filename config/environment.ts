export default {
  region: process.env.REGION,
  telegram: {
    token: process.env.TELEGRAM_TOKEN as string,
    chatId: process.env.TELEGRAM_CHAT_ID as string,
    ownerChatId: process.env.TELEGRAM_OWNER_CHAT_ID as string,
    botName: process.env.TELEGRAM_BOT_NAME as string,
  },
};
