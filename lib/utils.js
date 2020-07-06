'use strict';


const Telegram = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const querystring = require('querystring');
const moment = require('moment');
require('moment-timezone');


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
          inline_keyboard: [ [
            {
              text: 'CloudWatchLog',
              url: cloudWatchLogURL,
            },
          ] ]
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

  /**
   * 키워드로 장소검색
   * @param query
   * @returns {Promise<*>}
   */
  async place(query) {
    const result = await axios({
      method: 'post',
      url: `https://dapi.kakao.com/v2/local/search/keyword.json?query=${querystring.escape(query)}`,
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      }
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

  dateFunctions: {
    /**
     * 현지 Date 객체 반환
     * @returns {Date}
     */
    getLocalDate() {
      // new Date().toLocaleString("ko-KR", {timeZone: "Asia/Seoul"});
      // return new Date().toLocaleString(process.env.LOCALE, { timeZone: process.env.TIMEZONE });
      // return new Date();
      moment.tz(process.env.TIMEZONE);
      return moment();
    },

    /**
     * 소수점이 포함된 시간을 hh:mm:ss 형식으로 반환
     * @param hour
     * @returns {string}
     */
    getFormattedTime(hour) {
      const date = new Date(0, 0);
      date.setSeconds(+hour * 60 * 60);
      return date.toTimeString().slice(0, 8);
    },

    /**
     * 평일 여부 반환
     * @param year
     * @param month
     * @param date
     * @returns {boolean|boolean}
     */
    isWeekDay(year, month, date) {
      date = new Date(year, month, date).getDay();
      return date !== 0 && date !== 6;
    },

    /**
     * 특정 월의 일 수 반환
     * @param year
     * @param month
     * @returns {number}
     */
    getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    },

    /**
     * 특정 월의 평일 수 반환
     * @param year
     * @param month
     * @param startDate
     * @returns {number}
     */
    getWeekDaysInMonth(year, month, startDate = 1) {
      const daysInMonth = utils.dateFunctions.getDaysInMonth(year, month);
      const weekDayList = [];
      for (startDate; startDate <= daysInMonth; startDate += 1) {
        const currentDate = startDate;
        if (utils.dateFunctions.isWeekDay(year, month, currentDate)) {
          weekDayList.push(currentDate);
        }
      }
      return weekDayList.length;
    },

    /**
     * 특정 월의 근무일 수 반환
     * @param year
     * @param month
     * @param startDate
     * @param deductedDays
     * @returns {number}
     */
    getWorkingDaysInMonth(year, month, startDate = 1, deductedDays = 0) {
      return utils.dateFunctions.getWeekDaysInMonth(year, month, startDate) - deductedDays;
    },

    /**
     * 이번 달의 평일 수를 반환
     * @param deductedDays
     * @returns {number}
     */
    getWorkingDaysInThisMonth(deductedDays = 0) {
      const localDate = utils.dateFunctions.getLocalDate();
      const currentYear = localDate.year();
      const currentMonth = localDate.month() + 1;
      return utils.dateFunctions.getWorkingDaysInMonth(currentYear, currentMonth, 1, deductedDays);
    },

    /**
     * 오늘을 포함한 잔여 근무 가능 일 수
     * @param deductedDays
     * @returns {number}
     */
    getRemainingWorkingDaysInThisMonth(deductedDays = 0) {
      const localDate = utils.dateFunctions.getLocalDate();
      const currentYear = localDate.year();
      const currentMonth = localDate.month() + 1;
      const currentDate = localDate.date();
      return utils.dateFunctions.getWorkingDaysInMonth(currentYear, currentMonth, currentDate, deductedDays);
    },

    /**
     * 분을 포매팅하여 반환
     * @param minutes {number}
     * @param delimiter1
     * @param delimiter2 {string}
     * @returns {string}
     */
    minutesToFormat(minutes, delimiter1 = ':', delimiter2 = '') {
      return `${parseInt(minutes / 60)}${delimiter1}${minutes % 60}${delimiter2}`;
    },
  },

  async workingTimeCalculator(query, workHour = 9) {
    let [ workedTime, totalDeductedDays, remainingDeductedDays ] = query.split(' ');
    // workedTime;  // info: 변수 -> 일한 시간
    totalDeductedDays = isNaN(Number(totalDeductedDays)) ? 0 : Number(totalDeductedDays);  // info: 변수 -> 이번 달 모든 휴가, 공휴일 합계
    remainingDeductedDays = isNaN(Number(remainingDeductedDays)) ? 0 : Number(remainingDeductedDays);  // info: 변수 -> 이번 달 안 쓴 휴가, 공휴일 합계

    if (totalDeductedDays < remainingDeductedDays) {
      return '총 휴일보다 남은 휴일이 많을 수가 없어요.';
    }

    let [ workedHour, workedMinutes ] = workedTime.split(':');
    if (!workedHour || !workedMinutes) {
      return '근무 시간이 이상해요.';
    }
    if (isNaN(Number(workedHour)) || isNaN(Number(workedMinutes))) {
      return '근무 시간이 이상해요';
    }
    const localDate = utils.dateFunctions.getLocalDate();
    workedHour = Number(workedHour);
    workedMinutes = Number(workedMinutes);
    const totalWorkedMinutes = (workedHour * 60) + workedMinutes;  // info: 일 한 분
    const totalWorkedMinutesWithTotalDeductedDays = totalWorkedMinutes + (totalDeductedDays * workedHour * 60);  // info: 일 한 분 + 휴일 분

    // info: 이번 달 정보
    const weekDaysInThisMonth = utils.dateFunctions.getWeekDaysInMonth(localDate.year(), localDate.month() + 1);
    const weekHoursInThisMonth = weekDaysInThisMonth * workHour;
    const weekMinutesInThisMonth = weekHoursInThisMonth * 60;

    // info: 이번 달 휴일을 제외 한 근무 시간 관련 변수들
    const workingDaysInThisMonth = utils.dateFunctions.getWorkingDaysInThisMonth(totalDeductedDays);
    const workingHours = workingDaysInThisMonth * workHour;
    const workingMinutes = workingHours * 60;  // info: 총 워킹데이 기준 분


    // info: 이번 달 남은 근무 시간 관련 변수들
    const remainingMinutes = workingMinutes - totalWorkedMinutes;
    const formattedRemainingTime = utils.dateFunctions.minutesToFormat(remainingMinutes, '시간 ', '분');

    // info: 이번 달 남은 근무 가능 일(남은 휴일을 제한)
    const remainingWorkingDaysInThisMonth = utils.dateFunctions.getRemainingWorkingDaysInThisMonth(remainingDeductedDays);
    const averageRemainingTime = utils.dateFunctions.getFormattedTime(((remainingMinutes / remainingWorkingDaysInThisMonth) / 60));

    return `
*[${localDate.year()}-${localDate.month() + 1}-${localDate.date()}]*

일 한 시간: \`${workedTime}\`
총 휴일: \`${totalDeductedDays}일\`
남은 휴일: \`${remainingDeductedDays}일\`

평일: \`${weekDaysInThisMonth}일(${weekDaysInThisMonth * workHour}시간)\`
근무 일(휴일 제외): \`${workingDaysInThisMonth}일(${workingHours}시간)\`
 
남은 근무 가능일(오늘 포함): \`${remainingWorkingDaysInThisMonth}일(${remainingWorkingDaysInThisMonth * workHour}시간)\`

남은 근무 시간: \`${formattedRemainingTime}\`
근무 시간 달성률: \`${((totalWorkedMinutes / workingMinutes) * 100).toFixed(2)}%\`
남은 평균 근무 시간: \`${averageRemainingTime}\`
    `;
  }
};

module.exports = utils;
