import { default as axios } from 'axios';
import { Cheerio, CheerioAPI, load } from 'cheerio';
import * as dayjs from 'dayjs';
import { PREFIX_REDIS_KEY } from './constant';
import Redis from './Redis';

/**
 * 뉴스를 가져오는 클래스
 */
export class DailyNews {
  private liSelector: string =
    '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li';

  /**
   * 뉴스 URL을 가져오는 getter
   * @returns {URL} 뉴스 URL
   */
  private get url(): URL {
    return new URL('/breakingnews/section/105/230', 'https://news.naver.com');
  }

  /**
   * 주어진 URL에서 HTML을 가져옵니다.
   * @param {URL} url - HTML을 가져올 URL
   * @returns {Promise} HTML 데이터를 담은 Promise
   */
  private async getHtml(url: URL): Promise<any> {
    return axios({
      url: url.href,
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
   * li 리스트에서 메시지 리스트를 가져옵니다.
   * @param {CheerioAPI} cheerioAPI - CheerioAPI 인스턴스
   * @param {Cheerio} liList - li 리스트
   * @returns {string[]} 메시지 리스트
   */
  private getMessageList(cheerioAPI: CheerioAPI, liList: Cheerio<any>): string[] {
    const result: string[] = [];
    liList.each((_index: number, li) => {
      const a = cheerioAPI(li).find('a');
      result.push(`- [${a.text().trim()}](${a.attr('href')?.trim()})`);
    });

    return result;
  }

  /**
   * 메시지 리스트를 문자열로 변환합니다.
   * @param {string[]} messageList - 메시지 리스트
   * @returns {string} 변환된 문자열
   */
  private getMessage(messageList: string[]): string {
    return messageList.join('\n');
  }

  /**
   * 캐시된 메시지를 가져옵니다.
   * @async
   * @returns {Promise<string | null>}
   * @private
   */
  private async getCachedMessage(): Promise<string | null> {
    const today = dayjs().format('YYYY-MM-DD');
    const messageKey = `${PREFIX_REDIS_KEY}:dailyNews:${today}`;
    return await(await Redis.getInstance()).get(messageKey);
  }

  /**
   * 뉴스를 캐시합니다.
   * @async
   * @param {string} message - 캐시할 메시지
   * @returns {Promise<void>}
   * @private
   */
  private async setCachedMessage(message: string): Promise<void> {
    const today = dayjs().format('YYYY-MM-DD');
    const messageKey = `${PREFIX_REDIS_KEY}:dailyNews:${today}`;
    await(await Redis.getInstance()).set(messageKey, message, 3600);
  }

  /**
   * 일일 뉴스를 가져옵니다.
   * @returns {Promise<string>} 뉴스 문자열을 담은 Promise
   */
  async getDailyNews(): Promise<string> {
    const cachedMessage = await this.getCachedMessage();

    // case: 캐시된 메시지가 있을 경우
    if (cachedMessage !== null) {
      return cachedMessage;
    }

    const html = await this.getHtml(this.url);
    const cheerioAPI: CheerioAPI = load(html.data);
    const liList = this.getLiList(cheerioAPI);
    const messageList = this.getMessageList(cheerioAPI, liList);
    const message = this.getMessage(messageList);
    await this.setCachedMessage(message);

    return message;
  }
}
