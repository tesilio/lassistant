process.env.NTBA_FIX_319 = '1';
import * as Telegram from 'node-telegram-bot-api';
import { default as axios } from 'axios';
import * as querystring from 'querystring';
import { SendMessageOptions } from 'node-telegram-bot-api';


const utils = {
  /**
   * 텔레그램 봇 반환기
   */
  bot: () => {
    return new Telegram(process.env.TELEGRAM_TOKEN || 'ERROR!');
  },

  /**
   * 텔레그램 에러 메세지 센더
   * @param event
   * @param context
   * @param error
   * @returns {Promise<*>}
   */
  errorMessageSender: async (event: any, context: any, error: any) => {
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
          ]],
        },
      } as SendMessageOptions;

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
      return await bot.sendMessage(process.env.TELEGRAM_OWNER_CHAT_ID || 'ERROR!', text, options);
    } catch (e) {
      console.error(`errorMessageSender Error: ${e}`);
      throw e;
    }

  },

  /**
   * 단축 url을 만들어 반환한다
   * @param url
   * @returns {Promise<*>}
   */
  async shorturl(url: string) {
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

  /**
   * 키워드로 장소검색
   * @param query
   * @returns {Promise<*>}
   */
  async place(query: string) {
    const result = await axios({
      method: 'post',
      url: `https://dapi.kakao.com/v2/local/search/keyword.json?query=${querystring.escape(query)}`,
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      },
    });
    return result.data.documents;
    // {  // info: document
    //   address_name: '서울 강남구 도곡동 527',
    //     category_group_code: '',
    //   category_group_name: '',
    //   category_name: '부동산 > 주거시설 > 아파트',
    //   distance: '',
    //   id: '11249399',
    //   phone: '',
    //   place_name: '도곡렉슬아파트',
    //   place_url: 'http://place.map.kakao.com/11249399',
    //   road_address_name: '서울 강남구 선릉로 221',
    //   x: '127.04896778351079',
    //   y: '37.493040175772016'
    // }
  },
};

export = utils;
