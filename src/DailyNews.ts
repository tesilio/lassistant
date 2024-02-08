import * as cheerio from 'cheerio';
import { Cheerio, CheerioAPI, Element, SelectorType } from 'cheerio';
import { default as axios } from 'axios';

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
    //    return cheerioAPI('#main_content > div.list_body.newsflash_body > ul.type06_headline li');
  }

  /**
   * li 리스트에서 메시지 리스트를 가져옵니다.
   * @param {CheerioAPI} cheerioAPI - CheerioAPI 인스턴스
   * @param {Cheerio} liList - li 리스트
   * @returns {string[]} 메시지 리스트
   */
  private getMessageList(
    cheerioAPI: CheerioAPI,
    liList: Cheerio<
      '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li' extends SelectorType
        ? Element
        : string
    >,
  ): string[] {
    const result: string[] = [];
    liList.each((_index: number, li: Element) => {
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
   * 일일 뉴스를 가져옵니다.
   * @returns {Promise<string>} 뉴스 문자열을 담은 Promise
   */
  async getDailyNews(): Promise<string> {
    const html = await this.getHtml(this.url);
    const cheerioAPI: CheerioAPI = cheerio.load(html.data);
    const liList = this.getLiList(cheerioAPI);
    const messageList = this.getMessageList(cheerioAPI, liList);
    return this.getMessage(messageList);
  }
}
