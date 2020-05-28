'use strict';


const Telegram = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const querystring = require('querystring');


const utils = {
  /**
   * 텔레그램 봇 반환기
   */
  bot: () => {
    return new Telegram(process.env.TELEGRAM_TOKEN);
  },

  /**
   * 텔레그램 에러 메세지 센더
   * @param event
   * @param context
   * @param error
   * @returns {Promise<*>}
   */
  errorMessageSender: async (event, context, error) => {
    try {
      const bot = utils.bot();
      const region = process.env.REGION;
      let cloudWatchLogURL = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logEventViewer:group=${context.logGroupName};stream=${context.logStreamName};filter=${querystring.escape(`\'${context.awsRequestId}\'`)}`;
      let options = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'CloudWatchLog',
              url: cloudWatchLogURL,
            },
          ]]
        }
      };

      let messageObject = {
        errorMessage: error.message,
        requestBody: JSON.parse(event.body),
      };

      let text = `
Bot Error!
\`\`\`
${JSON.stringify(messageObject, null, 2)}
\`\`\`
        `;
      return await bot.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID, text, options);
    } catch (e) {
      console.error(`errorMessageSender Error: ${e}`);
      throw e;
    }

  },

  /**
   * 구글 검색을 해서 결과값을 반환한다
   * @param q {string}
   * @returns {Promise<{title: string, content: string}>}
   */
  async getGoogleSearchResult(q) {
    const params = querystring.stringify({
      q,
      oq: q,
      sourceid: 'chrome',
      ie: 'UTF-8',
    });
    const url = `https://www.google.com/search?${params}`;
    const html = await axios.get(url);
    html.data = html.data.replace(/�/gi, '');
    // console.log(html.data);
    const $ = cheerio.load(html.data);
    const divs = $('#main > div');

    const firstDiv = $('#main > div:nth-child(4)');
    let title = $(firstDiv).find('div > div:nth-child(1) span:nth-child(3) span').text();

    let content = '';
    if (title.includes('번역')) {
      title = $(firstDiv).find('div > div:nth-child(1) span:nth-child(3) span').text();
      content = $(firstDiv).find('div > div:nth-child(3) > div > div > div > div > div:nth-child(1) > div > div > div > div').text();
    }

    if (title.includes('날씨')) {
      title = $(firstDiv).find('div > div:nth-child(1) > span:nth-child(1) > span').text();
      const degrees = $(firstDiv).find('div > div:nth-child(3) > div > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div > div').text();
      const description = $(firstDiv).find('div > div:nth-child(3) > div > div > div > div > div:nth-child(1) > div:nth-child(2) > div > div > div > div').text();
      content = `${degrees.replace(/C/, '℃')}\n${description}`;
    }
    if (title === '' || content === '') {
      title = '일반 검색 결과';
      const contentArray = [];
      $(divs).each((idx, div) => {
        if (idx >= 3 && idx <= 11) {
          const title = $(div).find('div > div:nth-child(1) > a > div:nth-child(1)').text();
          const href = $(div).find('div > div:nth-child(1) > a').attr('href');
          let url = href ? href.replace(/^(\/url\?q=)/gi, '') : href;
          url = url ? url.replace(/^(\/imgres\?imgurl=)/gi, '') : url;
          url = querystring.parse(url);
          url = Object.keys(url).length > 0 ? Object.keys(url)[0] : '';
          // const navigator = $(div).find('div > div:nth-child(1) > a > div:nth-child(2)').text();
          // const description = $(div).find('div > div:nth-child(3)').text();
          if (title && url) {
            contentArray.push(`- [🔗](${url}) ${title}`);
          }
          // console.log('title:', title);
          // console.log('url:', url);
          // console.log('navigator:', navigator);
          // console.log('description:', description);
        }
      });
      content = contentArray.join('\n');
    }
    if (content === '') {
      content = '없음';
    }
    return { title, content };
  },

  /**
   * naver api를 이용하여 언어코드를 탐지한다
   * @param query {string}
   * @returns {Promise<*>}
   */
  async detectLanguage(query) {
    const result = await axios({
      url: `https://openapi.naver.com/v1/papago/detectLangs`,
      method: 'post',
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
      data: {
        query
      },
    });
    return result.data.langCode;
  },

  /**
   * naver api를 이용하여 번역한다
   * @param source {string}
   * @param target {string}
   * @param text {string}
   * @returns {Promise<*>}
   */
  async translation(source, target, text) {
    const result = await axios({
      url: `https://openapi.naver.com/v1/papago/n2mt`,
      method: 'post',
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
      data: {
        source,
        target,
        text,
      },
    });
    return result.data.message.result.translatedText;
  },

  /**
   * 단축 url을 만들어 반환한다
   * @param url
   * @returns {Promise<*>}
   */
  async shorturl(url) {
    const result = await axios({
      url: `https://openapi.naver.com/v1/util/shorturl?url=${url}`,
      method: 'post',
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      },
    });
    return result.data.result.url;
  },
};

module.exports = utils;
