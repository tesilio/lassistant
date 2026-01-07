import { AxiosResponse } from 'axios';
import { CheerioAPI, load } from 'cheerio';
import dayjs from 'dayjs';
import OpenAIManager from './OpenAIManager';
import { logger } from './infrastructure/logger';
import { httpClient } from './infrastructure/httpClient';

interface NewsInfo {
  title: string;
  url: string;
  summary?: string;
}

interface NewsCategory {
  name: string;
  url: string;
  selector: string;
  maxArticles: number;
}

export class DailyNews {
  private articleContentSelector: string = '#dic_area';
  private maxMessageLength: number = 4000;

  private readonly categories: NewsCategory[] = [
    {
      name: 'IT/과학',
      url: 'https://news.naver.com/section/105',
      selector:
        '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li',
      maxArticles: 5,
    },
    {
      name: '경제',
      url: 'https://news.naver.com/section/101',
      selector:
        '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li',
      maxArticles: 3,
    },
    {
      name: '사회',
      url: 'https://news.naver.com/section/102',
      selector:
        '#newsct > div.section_latest > div > div.section_latest_article._CONTENT_LIST._PERSIST_META ul > li',
      maxArticles: 3,
    },
  ];

  private async getHtml(url: URL | string): Promise<AxiosResponse<string>> {
    const targetUrl = typeof url === 'string' ? url : url.href;
    return httpClient.get<string>(targetUrl);
  }

  private getNewsInfoList(
    cheerioAPI: CheerioAPI,
    category: NewsCategory
  ): NewsInfo[] {
    const result: NewsInfo[] = [];
    const liList = cheerioAPI(category.selector);

    liList.each((_index, li) => {
      if (result.length >= category.maxArticles) return false;

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
      logger.error('기사 내용 가져오기 실패', error, { url });
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

  private escapeMarkdown(text: string): string {
    // 텔레그램 마크다운 링크 텍스트에서 문제가 되는 문자 대체
    // [] -> 「」 (corner brackets)
    // () -> （）(fullwidth parentheses)
    // ' -> ' (right single quotation mark)
    return text
      .replace(/\[/g, '「')
      .replace(/\]/g, '」')
      .replace(/\(/g, '（')
      .replace(/\)/g, '）')
      .replace(/'/g, '\u2019');
  }

  private getMessagesForTelegram(
    newsByCategory: Map<string, NewsInfo[]>
  ): string[] {
    const messages: string[] = [];
    let currentMessage = `📰 오늘의 뉴스 (${dayjs().format('YYYY-MM-DD')})\n`;

    for (const [categoryName, newsInfoList] of newsByCategory) {
      if (newsInfoList.length === 0) continue;

      const sectionHeader = `\n\n📌 *${categoryName}*\n${'─'.repeat(18)}\n\n`;
      const newsItems = newsInfoList.map((news) => {
        const escapedTitle = this.escapeMarkdown(news.title);
        let message = `• [${escapedTitle}](${news.url})`;
        if (news.summary) {
          message += `\n  ${news.summary}`;
        }
        return message;
      });

      // 섹션 헤더 추가
      if (currentMessage.length + sectionHeader.length > this.maxMessageLength) {
        messages.push(currentMessage);
        currentMessage = `(계속)${sectionHeader}`;
      } else {
        currentMessage += sectionHeader;
      }

      // 뉴스 아이템 추가
      for (const item of newsItems) {
        if (currentMessage.length + item.length + 2 > this.maxMessageLength) {
          messages.push(currentMessage);
          currentMessage = `(계속)\n\n${item}`;
        } else {
          if (currentMessage.endsWith('\n\n') || currentMessage.endsWith('━━\n\n')) {
            currentMessage += item;
          } else {
            currentMessage += '\n\n' + item;
          }
        }
      }
    }

    if (currentMessage.length > 0) {
      messages.push(currentMessage);
    }

    return messages;
  }

  async getDailyNews(): Promise<string[]> {
    const newsByCategory = new Map<string, NewsInfo[]>();

    for (const category of this.categories) {
      try {
        const html = await this.getHtml(category.url);
        const cheerioAPI: CheerioAPI = load(html.data);
        const newsInfoList = this.getNewsInfoList(cheerioAPI, category);

        // 각 뉴스의 요약 생성
        for (const newsInfo of newsInfoList) {
          const content = await this.getArticleContent(newsInfo.url);
          if (content) {
            newsInfo.summary = await this.summarizeText(content);
          }
        }

        newsByCategory.set(category.name, newsInfoList);
        logger.info(`${category.name} 뉴스 ${newsInfoList.length}개 수집 완료`);
      } catch (error) {
        logger.error(`${category.name} 뉴스 수집 실패`, error);
        newsByCategory.set(category.name, []);
      }
    }

    return this.getMessagesForTelegram(newsByCategory);
  }
}
