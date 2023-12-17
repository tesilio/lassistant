import * as cheerio from 'cheerio';
import { Cheerio, CheerioAPI, Element, SelectorType } from 'cheerio';
import { default as axios } from 'axios';
import * as iconv from 'iconv-lite';

/**
 * 뉴스를 가져오는 클래스
 */
export class DailyNews {
  /**
   * 뉴스 URL을 가져오는 getter
   * @returns {URL} 뉴스 URL
   */
  private get url(): URL {
    const url: URL = new URL('main/list.naver', 'https://news.naver.com');
    url.searchParams.set('mode', 'LS2d');
    url.searchParams.set('mid', 'shm');
    url.searchParams.set('sid1', '105');
    url.searchParams.set('sid2', '230');
    return url;
  }

  /**
   * 주어진 URL에서 HTML을 가져옵니다.
   * @param {URL} url - HTML을 가져올 URL
   * @returns {Promise} HTML 데이터를 담은 Promise
   */
  private async getHtml(url: URL): Promise<any> {
    return axios({
      url: url.toString(),
      method: 'GET',
      responseType: 'arraybuffer',
    });
  }

  /**
   * HTML 데이터를 문자열로 변환합니다.
   * @param {any} html - HTML 데이터
   * @returns {string} 변환된 문자열
   */
  private getContents(html: any): string {
    const contents = iconv.decode(html.data, 'EUC-KR').toString();
    return contents.replace(/�/gi, '');
  }

  /**
   * CheerioAPI를 사용하여 li 리스트를 가져옵니다.
   * @param {CheerioAPI} cheerioAPI - CheerioAPI 인스턴스
   * @returns {Cheerio} li 리스트
   */
  private getLiList(cheerioAPI: CheerioAPI): Cheerio<any> {
    return cheerioAPI('#main_content > div.list_body.newsflash_body > ul.type06_headline li');
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
      '#main_content > div.list_body.newsflash_body > ul.type06_headline li' extends SelectorType
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
    const contents = this.getContents(html);
    const cheerioAPI: CheerioAPI = cheerio.load(contents);
    const liList = this.getLiList(cheerioAPI);
    const messageList = this.getMessageList(cheerioAPI, liList);
    return this.getMessage(messageList);
  }
}
