'use strict';


const utils = require('../../lib/utils');
const BOT = utils.bot();
const TELEGRAM_BOT_NAME = process.env.TELEGRAM_BOT_NAME;
const parse_mode = 'Markdown';


/**
help - 도움말
q - 검색
*/
const messageEntities = {
  botCommands: {
    '/start': async message => {
      let text = `
반갑습니다. /help 명령어로 제가 뭘 할 수 있는지 알아보세요.
            `;
      return BOT.sendMessage(message.chat.id, text);
    },

    '/help': async message => {
      return commands.help(message);
    },

    [`/help${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.help(message, true);
    },

    '/q': async message => {
      return commands.search(message, true);
    },

    [`/q${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.search(message, true);
    },

    '/logging': async message => {
      return commands.logging(message);
    },

    [`/logging${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.logging(message, true);
    },

    /**
     * 실행함수
     * @param message
     * @param entity
     * @returns {Promise<void>}
     */
    getResult: async (message, entity) => {
      try {
        let splitCommand = message.text.split(' ')[0];
        let command = splitCommand.substr(entity.offset, entity.length);
        return messageEntities.botCommands[command](message);
      } catch (e) {
        console.error(`messageEntities.botCommands.getResult() Error: ${e}`);
        if (message.text.includes('@UBAPI_bot') || message.chat.type === 'private') {
          let text = '잘못된 요청이거나 에러입니다.';
          let disable_notification = false;
          if (e instanceof TypeError) {
            text = '잘못된 요청입니다.';
            if (message.chat.type === 'group') {
              disable_notification = true;
            }
          }
          return BOT.sendMessage(message.chat.id, text, {
            disable_notification,
          });
        }
      }

    },
  },
};

/**
 * 커맨드 함수들 객체
 * @type {{help: (function(*, *=): *), search: commands.search, logging: (function(): *), "/request_user_auth": (function(*=): *)}}
 */
const commands = {
  /**
   * help 커맨드 함수
   * @param message
   * @param disable_notification
   * @returns {Promise<*>}
   */
  help: async (message, disable_notification = false) => {
    let text = `
/q - 검색합니다.
            `;
    return BOT.sendMessage(message.chat.id, text, {
      disable_notification
    });
  },

  /**
   * q 커맨드 함수
   * @param message
   * @param disable_notification
   * @returns {Promise<*>}
   */
  search: async (message, disable_notification = false) => {
    try {
      const q = message.text.replace(/^(\/q\s*)|^(\/q)/, '');
      const { title, content } = await utils.getGoogleSearchResult(q);
      const text = `
*${title}*: ${q}

${content}
            `;
      return BOT.sendMessage(message.chat.id, text, {
        parse_mode,
        disable_notification,
      });
    } catch (e) {
      console.error(`commands.search() Error: ${e}`);
      throw e;
    }
  },

  /**
   * logging 커맨드 함수
   * @returns {Promise<*>}
   */
  logging: async () => {
    const text = `
*Logging*
\`\`\`json
${JSON.stringify(message, null, 2)}
\`\`\`            
            `;
    BOT.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID, text, {
      parse_mode
    });
    return BOT.sendMessage(message.chat.id, 'Complete!', {
      disable_notification: true,
    });
  },

  '/request_user_auth': async message => {
    const text = `
request_user_auth!
\`\`\`json
${JSON.stringify(message, null, 2)}
\`\`\`            
            `;
    BOT.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID, text, {
      parse_mode
    });
    const resultText = `
Request complete!
            `;
    return BOT.sendMessage(message.chat.id, resultText);
  },


};


const callbacks = {
  /**
   * Sample function
   * @param message
   * @param type
   * @returns {Promise<*>}
   */
  callback: async (message, type = 'type1') => {
    try {
      // info: logic!
      const text = `callback: ${type}`;
      return BOT.editMessageText(text, {
        chat_id: message.chat.id,
        message_id: message.message_id,
        parse_mode
      });
    } catch (e) {
      console.error(`callbacks.callback() Error: ${e}`);
      throw e;
    }
  },
};

const post = async event => {
  try {
    const requestBody = JSON.parse(event.body);
    if (requestBody.hasOwnProperty('message')) {
      const message = requestBody.message;

      if (message.hasOwnProperty('text')) {
        if (message.hasOwnProperty('entities') && message.entities.length > 0) {
          let promiseList = [];
          for (let idx in message.entities) {
            const entity = message.entities[idx];
            if (entity.type === 'bot_command') {
              let result = messageEntities.botCommands.getResult(message, entity);
              promiseList.push(result);
            }
          }
          await Promise.all(promiseList);
        }

      }
    }

    if (requestBody.hasOwnProperty('callback_query')) {
      // console.log(`!!!!!!!!!!!!!!!!요청본문!!!!!!!!!!!!!!!!: ${event.body}`);
      const callbackQuery = requestBody.callback_query;
      const message = callbackQuery.message;
      const data = requestBody.callback_query.data;
      await eval(`callbacks.${data}`);
      await BOT.sendMessage(OwnerChatId, `
*callback_query*
\`\`\`
${JSON.stringify(callbackQuery, null, 2)}
\`\`\`
            `, {
        parse_mode,
      });
    }
  } catch (e) {
    console.error(`Error in ${__filename}:`, e);
    throw e;
  }
};

module.exports = post;
