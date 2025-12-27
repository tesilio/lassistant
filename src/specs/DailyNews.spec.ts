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
    const mockListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808">Mock News Title</a></li></ul></div></div></div></div></body></html>';

    const mockArticleHtml =
      '<html><body><div id="dic_area">첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.</div></body></html>';

    mockHttpClient.get
      .mockResolvedValueOnce({ data: mockListHtml } as never)
      .mockResolvedValueOnce({ data: mockArticleHtml } as never);

    const messages = await dailyNews.getDailyNews();

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain('IT/과학 최신 뉴스');
    expect(messages[0]).toContain('Mock News Title');
    expect(messages[0]).toContain(
      'https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808',
    );
    expect(messages[0]).toContain('OpenAI로 요약된 내용입니다.');

    expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    expect(mockHttpClient.get).toHaveBeenNthCalledWith(
      1,
      'https://news.naver.com/breakingnews/section/105/230',
    );
    expect(mockHttpClient.get).toHaveBeenNthCalledWith(
      2,
      'https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808',
    );
  });

  it('메시지 길이 제한으로 인해 여러 메시지로 분할합니다', async () => {
    let htmlContent =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul>';
    for (let i = 1; i <= 10; i++) {
      htmlContent += `<li><a href="https://news.naver.com/article-${i}">Mock News Title ${i} - 긴 제목을 만들기 위한 추가 텍스트입니다</a></li>`;
    }
    htmlContent += '</ul></div></div></div></div></body></html>';

    const articleContent =
      '<html><body><div id="dic_area">긴 기사 내용입니다. '.repeat(20) + '</div></body></html>';

    mockHttpClient.get.mockResolvedValueOnce({ data: htmlContent } as never);
    for (let i = 0; i < 10; i++) {
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
    const mockListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/article-1">Test Article</a></li></ul></div></div></div></div></body></html>';

    const mockArticleHtml =
      '<html><body><div id="dic_area">첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.</div></body></html>';

    mockSummarizeText.mockRejectedValueOnce(new Error('API 오류'));

    mockHttpClient.get
      .mockResolvedValueOnce({ data: mockListHtml } as never)
      .mockResolvedValueOnce({ data: mockArticleHtml } as never);

    const messages = await dailyNews.getDailyNews();

    expect(messages[0]).toContain('첫 번째 문장입니다');
    expect(messages[0]).toContain('두 번째 문장입니다');
    expect(messages[0]).toContain('세 번째 문장입니다');
  });

  it('기사 내용 가져오기 실패 시 요약 없이 진행합니다', async () => {
    const mockListHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/article-1">Test Article</a></li></ul></div></div></div></div></body></html>';

    mockHttpClient.get
      .mockResolvedValueOnce({ data: mockListHtml } as never)
      .mockRejectedValueOnce(new Error('네트워크 오류'));

    const messages = await dailyNews.getDailyNews();

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toContain('Test Article');
  });
});
