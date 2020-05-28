'use strict';


const axios = require('axios');
const READLINE = require('readline');
const RL = READLINE.createInterface({
  input: process.stdin,
  output: process.stdout
});

const setWebHook = {
  /**
   * 프롬프트!
   * @param q
   * @param comment
   * @returns {Promise<*>}
   */
  ask: async (q, comment = false) => {
    return new Promise((resolve) => {
      console.log('');
      if (comment) {
        console.log(comment);
      }
      RL.question(q, (input) => {
        return resolve(input);
      });
    });
  },

  run: async () => {
    try{
      const token = await setWebHook.ask('Telegram Bot Token (required): ');
      const url = await setWebHook.ask('URL (required): ');
      const result = await axios({
        method: 'post',
        url: `https://api.telegram.org/bot${token}/setWebhook`,
        data: {
          url: url,
        },
      });
      console.log(JSON.stringify(result.data, null, 2));
    }catch (e) {
      console.error(e);
    }
    process.exit();
  }
};
setWebHook.run();