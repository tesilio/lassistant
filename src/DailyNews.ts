import { default as axios, AxiosResponse } from 'axios';
import { CheerioAPI, load } from 'cheerio';
import dayjs from 'dayjs';
import OpenAIManager from './OpenAIManager';

interface NewsInfo {
  title: string;
  url: string;
  summary?: string;
}

export class DailyNews {
  private liSelector: string =
    '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li';
  private articleContentSelector: string = '#dic_area';
  private maxArticlesToCrawl: number = 10;
  private maxMessageLength: number = 4000;

  private get url(): URL {
    return new URL('/breakingnews/section/105/230', 'https://news.naver.com');
  }

  private async getHtml(url: URL | string): Promise<AxiosResponse<string>> {
    return axios({
      url: typeof url === 'string' ? url : url.href,
      method: 'get',
    });
  }

  private getNewsInfoList(cheerioAPI: CheerioAPI): NewsInfo[] {
    const result: NewsInfo[] = [];
    const liList = cheerioAPI(this.liSelector);

    liList.each((_index, li) => {
      if (result.length >= this.maxArticlesToCrawl) return false;

      const a = cheerioAPI(li).find('a');
      const title = a.text().trim();
      const url = a.attr('href')?.trim();

      if (title && url) {
        result.push({ title, url });
      }
      return true;
    });

    return result;
  }

  private async getArticleContent(url: string): Promise<string> {
    try {
      const html = await this.getHtml(url);
      const cheerioAPI: CheerioAPI = load(html.data);
      const contentElement = cheerioAPI(this.articleContentSelector);

      return contentElement.text().trim().replace(/\s+/g, ' ');
    } catch (error) {
      console.error(`기사 내용 가져오기 실패: ${url}`, error);
      return '';
    }
  }

  private async summarizeText(text: string): Promise<string> {
    try {
      return await OpenAIManager.getInstance().summarizeText(text);
    } catch {
      return this.fallbackSummarize(text);
    }
  }

  private fallbackSummarize(text: string, maxSentences: number = 3): string {
    if (!text) return '';

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length <= maxSentences) {
      return sentences.join('. ') + '.';
    }

    return sentences.slice(0, maxSentences).join('. ') + '.';
  }

  private getMessagesForTelegram(newsInfoList: NewsInfo[]): string[] {
    const newsItems = newsInfoList.map((news) => {
      let message = `- [${news.title}](${news.url})`;
      if (news.summary) {
        message += `\n${news.summary}`;
      }
      return message;
    });

    const messages: string[] = [];
    let currentMessage = `IT/과학 최신 뉴스 (${dayjs().format('YYYY-MM-DD')})\n\n`;

    for (const item of newsItems) {
      if (currentMessage.length + item.length + 2 > this.maxMessageLength) {
        messages.push(currentMessage);
        currentMessage = `(계속)\n\n${item}`;
      } else {
        if (currentMessage.endsWith('\n\n')) {
          currentMessage += item;
        } else {
          currentMessage += '\n\n' + item;
        }
      }
    }

    if (currentMessage.length > 0) {
      messages.push(currentMessage);
    }

    return messages;
  }

  async getDailyNews(): Promise<string[]> {
    const html = await this.getHtml(this.url);
    const cheerioAPI: CheerioAPI = load(html.data);
    const newsInfoList = this.getNewsInfoList(cheerioAPI);

    for (const newsInfo of newsInfoList) {
      const content = await this.getArticleContent(newsInfo.url);
      if (content) {
        newsInfo.summary = await this.summarizeText(content);
      }
    }

    return this.getMessagesForTelegram(newsInfoList);
  }
}
