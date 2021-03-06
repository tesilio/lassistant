'use strict';


const utils = require('../../lib/utils');
const BOT = utils.bot();
const TELEGRAM_BOT_NAME = process.env.TELEGRAM_BOT_NAME;
const parse_mode = 'Markdown';


/**
 help - 도움말
 q - 검색
 ko - 한국어로 번역
 ja - 일본어로 번역
 en - 영어로 번역
 shorturl - URL 단축
 place - 키워드로 장소 검색
 wt - 9시간 기준 월별 근무 시간 계산
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

    '/ko': async message => {
      return commands.translation('ko', message, true);
    },

    [`/ko${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.translation('ko', message, true);
    },

    '/en': async message => {
      return commands.translation('en', message, true);
    },

    [`/en${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.translation('en', message, true);
    },

    '/ja': async message => {
      return commands.translation('ja', message, true);
    },

    [`/ja${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.translation('ja', message, true);
    },

    '/shorturl': async message => {
      return commands.shorturl(message, true);
    },

    [`/shorturl${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.shorturl(message, true);
    },

    '/place': async message => {
      return commands.place(message, true);
    },

    [`/place${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.place(message, true);
    },

    '/wt': async message => {
      return commands.wt(message);
    },

    [`/wt${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.wt(message, true);
    },

    '/logging': async message => {
      return commands.logging();
    },

    [`/logging${TELEGRAM_BOT_NAME}`]: async message => {
      return commands.logging();
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
/help - 도움말
/q - 검색합니다. 예) /q test
/ko - 한국어로 번역합니다. 예) /ko test
/ja - 일본어로 번역합니다. 예) /ja 테스트
/en - 영어로 번역합니다. 예) /en 테스트
/shorturl - 긴 길이의 URL을 짧게 바꿔줍니다. 예) /shorturl https://ko.wikipedia.org/wiki/URL
/place - 장소검색을 합니다. 예) /place 강남구청
/wt - 9시간 기준 월별 근무 시간을 계산합니다. 예) /wt 35:24 3 1
  - 35:24 -> 이번 달 근무 했던 시간:분
  - 3 -> 이번달 총 휴무, 공휴일 수
  - 1 -> 이번달 중 앞으로 남은 총 휴무, 공휴일 수
  - 재택 근무는 근무 시간에 임의로 더해 주세요!
   `;
    return BOT.sendMessage(message.chat.id, text, {
      disable_notification,
      disable_web_page_preview: true,
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
   * 번역
   * @param target {string}
   * @param message
   * @param disable_notification
   * @returns {Promise<*>}
   */
  translation: async (target, message, disable_notification = false) => {
    try {
      const query = message.text.replace(/^(\/..\s)|^(\/..)/, '');
      let text = 'None!';
      if (query !== '') {
        const source = await utils.detectLanguage(query);
        const content = await utils.translation(source, target, query);
        text = `
*${source}(감지됨) -> ${target}*

${content}
            `;
      }
      return BOT.sendMessage(message.chat.id, text, {
        parse_mode,
        disable_notification,
      });
    } catch (e) {
      console.error(`commands.translation() Error: ${e}`);
      throw e;
    }
  },

  /**
   * 단축 url
   * @param message
   * @param disable_notification
   * @returns {Promise<*>}
   */
  shorturl: async (message, disable_notification = false) => {
    try {
      const query = message.text.replace(/^(\/shorturl\s)|^(\/shorturl)/, '');
      let text = 'None!';
      if (query !== '') {
        const url = await utils.shorturl(query);
        text = `
ShortURL: ${url}
QR: ${url}.qr
            `;
      }
      return BOT.sendMessage(message.chat.id, text, {
        parse_mode,
        disable_notification,
      });
    } catch (e) {
      console.error(`commands.shorturl() Error: ${e}`);
      throw e;
    }
  },

  /**
   * 키워드로 장소검색
   * @param message
   * @param disable_notification
   * @returns {Promise<*>}
   */
  place: async (message, disable_notification = false) => {
    try {
      const query = message.text.replace(/^(\/place\s)|^(\/place)/, '');
      let text = 'None!';
      if (query !== '') {
        const places = await utils.place(query);
        if (places.length > 0) {
          const textArray = [];
          places.map(place => {
            textArray.push(`- [${place.place_name}](${place.place_url}): ${place.road_address_name}(${place.address_name})`);
          });
          text = textArray.join('\n');
        }
      }
      return BOT.sendMessage(message.chat.id, text, {
        parse_mode,
        disable_notification,
      });
    } catch (e) {
      console.error(`commands.place() Error: ${e}`);
      throw e;
    }
  },

  /**
   * 9시간 근무시간 계산기
   * @param message
   * @param disable_notification
   * @returns {Promise<unknown>}
   */
  wt: async (message, disable_notification = false) => {
    try {
      const query = message.text.replace(/^(\/wt\s)|^(\/wt)/, '');
      let text = 'Nope!';
      if (query !== '') {
        try {
          text = await utils.workingTimeCalculator(query);
        } catch (e) {
          return BOT.sendMessage(message.chat.id, 'Invalid Request!', {
            parse_mode,
            disable_notification,
          });
        }
      }
      return BOT.sendMessage(message.chat.id, text, {
        parse_mode,
        disable_notification,
      });
    } catch (e) {
      console.error(`commands.wt() Error: ${e}`);
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
