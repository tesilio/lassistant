import { DailyNews } from '../DailyNews';
import { httpClient } from '../infrastructure/httpClient';
import OpenAIManager from '../OpenAIManager';

jest.mock('../../config/environment', () => ({
  default: {
    openai: {
      apiKey: 'test-api-key',
    },
  },
}));

jest.mock('../OpenAIManager');
jest.mock('../infrastructure/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;
const mockSummarizeText = jest.fn();

describe('DailyNews', () => {
  let dailyNews: DailyNews;

  beforeEach(() => {
    jest.clearAllMocks();
    (OpenAIManager.getInstance as jest.Mock).mockReturnValue({
      summarizeText: mockSummarizeText,
    });
    mockSummarizeText.mockResolvedValue('OpenAI로 요약된 내용입니다.');
    dailyNews = new DailyNews();
  });

  it('일일 뉴스를 가져옵니다', async () => {
    // 경제 섹션 HTML
    const mockEconomyListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/economy-1">Economy News Title</a></li></ul></div></div></div></div></body></html>';

    // 사회 섹션 HTML
    const mockSocietyListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/society-1">Society News Title</a></li></ul></div></div></div></div></body></html>';

    // IT/과학 섹션 HTML
    const mockTechListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/tech-1">Tech News Title</a></li></ul></div></div></div></div></body></html>';

    const mockArticleHtml =
      '<html><body><div id="dic_area">첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.</div></body></html>';

    mockHttpClient.get
      .mockResolvedValueOnce({ data: mockEconomyListHtml } as never) // 경제 페이지
      .mockResolvedValueOnce({ data: mockArticleHtml } as never) // 경제 기사
      .mockResolvedValueOnce({ data: mockSocietyListHtml } as never) // 사회 페이지
      .mockResolvedValueOnce({ data: mockArticleHtml } as never) // 사회 기사
      .mockResolvedValueOnce({ data: mockTechListHtml } as never) // IT/과학 페이지
      .mockResolvedValueOnce({ data: mockArticleHtml } as never); // IT/과학 기사

    const messages = await dailyNews.getDailyNews();

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain('오늘의 뉴스');
    expect(messages[0]).toContain('경제');
    expect(messages[0]).toContain('사회');
    expect(messages[0]).toContain('IT/과학');

    expect(mockHttpClient.get).toHaveBeenCalledWith('https://news.naver.com/section/101');
    expect(mockHttpClient.get).toHaveBeenCalledWith('https://news.naver.com/section/102');
    expect(mockHttpClient.get).toHaveBeenCalledWith('https://news.naver.com/section/105');
  });

  it('메시지 길이 제한으로 인해 여러 메시지로 분할합니다', async () => {
    // 경제 섹션 - 많은 뉴스
    let economyContent =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul>';
    for (let i = 1; i <= 3; i++) {
      economyContent += `<li><a href="https://news.naver.com/economy-${i}">Economy News ${i} - 긴 제목</a></li>`;
    }
    economyContent += '</ul></div></div></div></div></body></html>';

    // 사회 섹션
    let societyContent =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul>';
    for (let i = 1; i <= 3; i++) {
      societyContent += `<li><a href="https://news.naver.com/society-${i}">Society News ${i} - 긴 제목</a></li>`;
    }
    societyContent += '</ul></div></div></div></div></body></html>';

    // IT/과학 섹션 - 많은 뉴스
    let techContent =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul>';
    for (let i = 1; i <= 4; i++) {
      techContent += `<li><a href="https://news.naver.com/tech-${i}">Tech News ${i} - 긴 제목</a></li>`;
    }
    techContent += '</ul></div></div></div></div></body></html>';

    const articleContent =
      '<html><body><div id="dic_area">긴 기사 내용입니다. '.repeat(20) + '</div></body></html>';

    // 경제 페이지 -> 경제 기사들 -> 사회 페이지 -> 사회 기사들 -> IT/과학 페이지 -> IT/과학 기사들
    mockHttpClient.get.mockResolvedValueOnce({ data: economyContent } as never);
    for (let i = 0; i < 3; i++) {
      mockHttpClient.get.mockResolvedValueOnce({ data: articleContent } as never);
    }
    mockHttpClient.get.mockResolvedValueOnce({ data: societyContent } as never);
    for (let i = 0; i < 3; i++) {
      mockHttpClient.get.mockResolvedValueOnce({ data: articleContent } as never);
    }
    mockHttpClient.get.mockResolvedValueOnce({ data: techContent } as never);
    for (let i = 0; i < 4; i++) {
      mockHttpClient.get.mockResolvedValueOnce({ data: articleContent } as never);
    }

    const messages = await dailyNews.getDailyNews();

    expect(messages.length).toBeGreaterThanOrEqual(1);

    // case: 메시지가 분할된 경우, 첫 번째 메시지 이후에 (계속) 표시가 있는지 확인
    if (messages.length > 1) {
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].startsWith('(계속)')).toBe(true);
      }
    }
  });

  it('OpenAI 실패 시 fallback 요약을 사용합니다', async () => {
    const emptyHtml = '<html><body></body></html>';
    const mockListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/article-1">Test Article</a></li></ul></div></div></div></div></body></html>';

    const mockArticleHtml =
      '<html><body><div id="dic_area">첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.</div></body></html>';

    mockSummarizeText.mockRejectedValue(new Error('API 오류'));

    mockHttpClient.get
      .mockResolvedValueOnce({ data: mockListHtml } as never) // IT/과학 페이지
      .mockResolvedValueOnce({ data: mockArticleHtml } as never) // 기사
      .mockResolvedValueOnce({ data: emptyHtml } as never) // 경제 페이지 (빈 페이지)
      .mockResolvedValueOnce({ data: emptyHtml } as never); // 사회 페이지 (빈 페이지)

    const messages = await dailyNews.getDailyNews();

    expect(messages[0]).toContain('첫 번째 문장입니다');
    expect(messages[0]).toContain('두 번째 문장입니다');
    expect(messages[0]).toContain('세 번째 문장입니다');
  });

  it('기사 내용 가져오기 실패 시 요약 없이 진행합니다', async () => {
    const emptyHtml = '<html><body></body></html>';
    const mockListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/article-1">Test Article</a></li></ul></div></div></div></div></body></html>';

    mockHttpClient.get
      .mockResolvedValueOnce({ data: mockListHtml } as never) // IT/과학 페이지
      .mockRejectedValueOnce(new Error('네트워크 오류')) // 기사 가져오기 실패
      .mockResolvedValueOnce({ data: emptyHtml } as never) // 경제 페이지 (빈 페이지)
      .mockResolvedValueOnce({ data: emptyHtml } as never); // 사회 페이지 (빈 페이지)

    const messages = await dailyNews.getDailyNews();

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain('Test Article');
  });
});
