// This file is a sample. Please change the file to config.js and use it.
// You must fill in the required items before they can run normally.

module.exports.TELEGRAM = (serverless) => ({
  dev: {
    TELEGRAM_TOKEN: '<Please fill in this information>',
    TELEGRAM_BOT_NAME: '<Please fill in this information>',
    TELEGRAM_CHAT_ID: '<Please fill in this information>',
    TELEGRAM_OWNER_CHAT_ID: '<Please fill in this information>',
  },
  production: {
    TELEGRAM_TOKEN: '<Please fill in this information>',
    TELEGRAM_BOT_NAME: '<Please fill in this information>',
    TELEGRAM_CHAT_ID: '<Please fill in this information>',
    TELEGRAM_OWNER_CHAT_ID: '<Please fill in this information>',
  }
});

module.exports.NAVER = (serverless) => ({
  dev: {
    CLIENT_ID: '<Please fill in this information>',
    CLIENT_SECRET: '<Please fill in this information>',
  },
  production: {
    CLIENT_ID: '<Please fill in this information>',
    CLIENT_SECRET: '<Please fill in this information>',
  }
});

module.exports.KAKAO = (serverless) => ({
  dev: {
    KAKAO_REST_API_KEY: '<Please fill in this information>',
  },
  production: {
    KAKAO_REST_API_KEY: '<Please fill in this information>',
  }
});
