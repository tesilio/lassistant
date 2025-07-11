import { default as axios } from 'axios';
import { Cheerio, CheerioAPI, load } from 'cheerio';
import * as dayjs from 'dayjs';
import { PREFIX_REDIS_KEY } from './constant';
import RedisManager from './RedisManager';
import OpenAIManager from './OpenAIManager';

/**
 * 뉴스 정보 인터페이스
 */
interface NewsInfo {
  title: string;
  url: string;
  summary?: string;
}

/**
 * 뉴스를 가져오는 클래스
 */
export class DailyNews {
  private liSelector: string =
    '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li';
  private articleContentSelector: string = '#dic_area';
  private maxArticlesToCrawl: number = 10; // 최대 크롤링할 기사 수
  private maxMessageLength: number = 4000; // 텔레그램 메시지 최대 길이 (여유 있게 설정)

  /**
   * 뉴스 URL을 가져오는 getter
   * @returns {URL} 뉴스 URL
   */
  private get url(): URL {
    return new URL('/breakingnews/section/105/230', 'https://news.naver.com');
  }

  /**
   * 주어진 URL에서 HTML을 가져옵니다.
   * @param {URL | string} url - HTML을 가져올 URL
   * @returns {Promise} HTML 데이터를 담은 Promise
   */
  private async getHtml(url: URL | string): Promise<any> {
    return axios({
      url: typeof url === 'string' ? url : url.href,
      method: 'get',
    });
  }

  /**
   * CheerioAPI를 사용하여 li 리스트를 가져옵니다.
   * @param {CheerioAPI} cheerioAPI - CheerioAPI 인스턴스
   * @returns {Cheerio} li 리스트
   */
  private getLiList(cheerioAPI: CheerioAPI): Cheerio<any> {
    return cheerioAPI(this.liSelector);
  }

  /**
   * li 리스트에서 뉴스 정보를 가져옵니다.
   * @param {CheerioAPI} cheerioAPI - CheerioAPI 인스턴스
   * @param {Cheerio} liList - li 리스트
   * @returns {NewsInfo[]} 뉴스 정보 리스트
   */
  private getNewsInfoList(cheerioAPI: CheerioAPI, liList: Cheerio<any>): NewsInfo[] {
    const result: Array<NewsInfo> = [];
    //@ts-ignore
    liList.each((_index: number, li) => {
      if (result.length >= this.maxArticlesToCrawl) return false;

      const a = cheerioAPI(li).find('a');
      const title = a.text().trim();
      const url = a.attr('href')?.trim();

      if (title && url) {
        result.push({
          title,
          url,
        });
      }
    });

    return result;
  }

  /**
   * 기사 내용을 가져옵니다.
   * @param {string} url - 기사 URL
   * @returns {Promise<string>} 기사 내용
   */
  private async getArticleContent(url: string): Promise<string> {
    try {
      const html = await this.getHtml(url);
      const cheerioAPI: CheerioAPI = load(html.data);
      const contentElement = cheerioAPI(this.articleContentSelector);

      // 모든 텍스트 내용 가져오기
      return contentElement.text().trim().replace(/\s+/g, ' ');
    } catch (error) {
      console.error(`기사 내용 가져오기 실패: ${url}`, error);
      return '';
    }
  }

  /**
   * 텍스트를 요약합니다.
   * @param {string} text - 요약할 텍스트
   * @returns {Promise<string>} 요약된 텍스트
   */
  private async summarizeText(text: string): Promise<string> {
    try {
      return await OpenAIManager.getInstance().summarizeText(text);
    } catch (error) {
      // OpenAI API 실패 시 fallback 요약 사용
      return this.fallbackSummarize(text);
    }
  }

  /**
   * API 요약 실패 시 사용할 대체 요약 메소드
   * @param {string} text - 요약할 텍스트
   * @param {number} maxSentences - 최대 문장 수
   * @returns {string} 요약된 텍스트
   */
  private fallbackSummarize(text: string, maxSentences: number = 3): string {
    if (!text) return '';

    // 문장으로 분리
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // 문장이 maxSentences보다 적으면 그대로 반환
    if (sentences.length <= maxSentences) {
      return sentences.join('. ') + '.';
    }

    // 간단한 요약: 첫 n개 문장 선택
    return sentences.slice(0, maxSentences).join('. ') + '.';
  }

  /**
   * 기사 정보와 요약된 내용을 포함한 메시지를 생성합니다.
   * @param {NewsInfo[]} newsInfoList - 뉴스 정보 리스트
   * @returns {string[]} 생성된 메시지 배열
   */
  private getMessagesForTelegram(newsInfoList: NewsInfo[]): string[] {
    // 각 뉴스 항목을 문자열로 변환
    const newsItems = newsInfoList.map((news) => {
      let message = `- [${news.title}](${news.url})`;
      if (news.summary) {
        message += `\n${news.summary}`;
      }
      return message;
    });

    // 메시지 분할
    const messages: Array<string> = [];
    let currentMessage = `IT/과학 최신 뉴스 (${dayjs().format('YYYY-MM-DD')})\n\n`;

    for (const item of newsItems) {
      // 현재 메시지에 항목을 추가했을 때 최대 길이를 초과하는지 확인
      if (currentMessage.length + item.length + 2 > this.maxMessageLength) {
        // 현재 메시지를 배열에 추가하고 새 메시지 시작
        messages.push(currentMessage);
        currentMessage = `(계속)\n\n${item}`;
      } else {
        // 현재 메시지에 항목 추가
        if (currentMessage.endsWith('\n\n')) {
          currentMessage += item;
        } else {
          currentMessage += '\n\n' + item;
        }
      }
    }

    // 마지막 메시지 추가
    if (currentMessage.length > 0) {
      messages.push(currentMessage);
    }

    return messages;
  }

  /**
   * 캐시된 메시지를 가져옵니다.
   * @async
   * @returns {Promise<Array<string> | null>}
   * @private
   */
  private async getCachedMessages(): Promise<Array<string> | null> {
    // todo: 레디스 연결 복구하기 전까지 주석 처리
//    const today = dayjs().format('YYYY-MM-DD');
//    const messageKey = `${PREFIX_REDIS_KEY}:dailyNews:${today}`;
//    const cachedData = await RedisManager.getInstance().get(messageKey);
//
//    if (cachedData) {
//      try {
//        return JSON.parse(cachedData);
//      } catch (error) {
//        console.error('캐시된 메시지 파싱 실패:', error);
//        return null;
//      }
//    }

    return null;
  }

  /**
   * 뉴스를 캐시합니다.
   * @async
   * @param {Array<string>} messages - 캐시할 메시지 배열
   * @returns {Promise<void>}
   * @private
   */
  private async setCachedMessages(messages: Array<string>): Promise<void> {
    // todo: 레디스 연결 복구하기 전까지 주석 처리
//    const today = dayjs().format('YYYY-MM-DD');
//    const messageKey = `${PREFIX_REDIS_KEY}:dailyNews:${today}`;
//    await RedisManager.getInstance().set(messageKey, JSON.stringify(messages), 3600);
    console.log(messages);
  }

  /**
   * 일일 뉴스를 가져옵니다.
   * @returns {Promise<Array<string>>} 뉴스 메시지 배열을 담은 Promise
   */
  async getDailyNews(): Promise<Array<string>> {
    const cachedMessages = await this.getCachedMessages();

    // case: 캐시된 메시지가 있을 경우
    if (cachedMessages !== null) {
      return cachedMessages;
    }

    const html = await this.getHtml(this.url);
    const cheerioAPI: CheerioAPI = load(html.data);
    const liList = this.getLiList(cheerioAPI);
    const newsInfoList = this.getNewsInfoList(cheerioAPI, liList);

    // 각 기사의 내용을 가져와서 요약
    for (const newsInfo of newsInfoList) {
      const content = await this.getArticleContent(newsInfo.url);
      if (content) {
        newsInfo.summary = await this.summarizeText(content);
      }
    }

    const messages = this.getMessagesForTelegram(newsInfoList);
    await this.setCachedMessages(messages);

    return messages;
  }
}
