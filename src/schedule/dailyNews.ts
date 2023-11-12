import * as utils from '../../lib/utils';
import * as cheerio from 'cheerio';
import { Cheerio, CheerioAPI, Element, SelectorType } from 'cheerio';
import { default as axios } from 'axios';
import * as iconv from 'iconv-lite';
import { Lassistant } from "../Lassistant";
import environment from "../../config/environment";

class DailyNews {
  private get url() {
    const url: URL = new URL('main/list.naver', 'https://news.naver.com');
    url.searchParams.set('mode', 'LS2d');
    url.searchParams.set('mid', 'shm');
    url.searchParams.set('sid1', '105');
    url.searchParams.set('sid2', '230');
    return url;
  }

  private async getHtml(url: URL) {
    return axios({
      url: url.toString(),
      method: 'GET',
      responseType: 'arraybuffer',
    });
  }

  private getContents(html: any) {
    const contents = iconv.decode(html.data, 'EUC-KR').toString();
    return contents.replace(/�/gi, '');
  }

  private getLiList(cheerioAPI: CheerioAPI) {
    return cheerioAPI('#main_content > div.list_body.newsflash_body > ul.type06_headline li');
  }

  private getMessageList(cheerioAPI: CheerioAPI, liList: Cheerio<"#main_content > div.list_body.newsflash_body > ul.type06_headline li" extends SelectorType ? Element : string>): string[] {
    const result: string[] = [];
    liList.each(function (index: number, li: Element) {
      index;
      const a = cheerioAPI(li).find('a');
      result.push(`- [${a.text().trim()}](${a.attr('href')?.trim()})`);
    });
    return result;
  }

  private getMessage(messageList: string[]) {
    return messageList.join('\n');
  }

  private async sendMessage(message: string): Promise<void> {
    const lassistant = new Lassistant();
    await lassistant.sendMessage(environment.telegram.chatId || 'ERROR!', message);
  }

  async execute(): Promise<void> {
    const html = await this.getHtml(this.url);
    const contents = this.getContents(html);
    const cheerioAPI: CheerioAPI = cheerio.load(contents);
    const liList = this.getLiList(cheerioAPI);
    const messageList = this.getMessageList(cheerioAPI, liList);
    const message = this.getMessage(messageList);
    await this.sendMessage(message);
  }
}

exports.handler = async (event: any, context: any) => {
  try {
    const dailyNews = new DailyNews();
    await dailyNews.execute();
  } catch (e) {
    console.error(`Final Catch in ${__filename}:`, e);
    await utils.errorMessageSender(event, context, e);
  }
  return {
    statusCode: 200,
  };
};
