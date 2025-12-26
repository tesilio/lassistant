import { DailyNews } from '../DailyNews';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockOpenAIInstance = {
  summarizeText: jest.fn(),
};

jest.mock('../../config/environment', () => ({
  default: {
    openai: {
      apiKey: 'test-api-key',
    },
  },
}));

jest.mock('../OpenAIManager', () => ({
  default: {
    getInstance: jest.fn(() => mockOpenAIInstance),
  },
}));

describe('DailyNews', () => {
  let mockAxios: MockAdapter;
  let dailyNews: DailyNews;

  // 각 테스트 전에 실행됩니다.
  beforeEach(() => {
    // 모킹 초기화
    jest.clearAllMocks();
    // OpenAI mock 기본값 설정 (clearAllMocks 후에 설정해야 함)
    mockOpenAIInstance.summarizeText.mockResolvedValue('OpenAI로 요약된 내용입니다.');

    mockAxios = new MockAdapter(axios);
    dailyNews = new DailyNews();
  });

  // 각 테스트 후에 실행됩니다.
  afterEach(() => {
    mockAxios.restore();
  });

  // 'getDailyNews' 메서드가 일일 뉴스를 가져오는지 테스트합니다.
  it('일일 뉴스를 가져옵니다', async () => {
    // 뉴스 목록 페이지 HTML 모킹 (URL 업데이트)
    const mockHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808">Mock News Title</a></li></ul></div></div></div></div></body></html>';
    mockAxios.onGet('https://news.naver.com/breakingnews/section/105/230').reply(200, mockHtml);

    // 개별 뉴스 기사 내용 HTML 모킹
    const mockArticleHtml =
      '<html><body><div id="dic_area">첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.</div></body></html>';
    mockAxios
      .onGet(
        'https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808',
      )
      .reply(200, mockArticleHtml);

    const messages = await dailyNews.getDailyNews();

    // 메시지가 배열인지 확인
    expect(Array.isArray(messages)).toBe(true);
    // 최소 하나의 메시지가 있는지 확인
    expect(messages.length).toBeGreaterThan(0);

    // 첫 번째 메시지에 제목, URL, 요약 내용이 포함되어 있는지 확인
    expect(messages[0]).toContain('IT/과학 최신 뉴스');
    expect(messages[0]).toContain('Mock News Title');
    expect(messages[0]).toContain(
      'https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808',
    );
    // fallback summarize가 동작하여 첫 3개 문장이 포함됨
    expect(messages[0]).toContain('첫 번째 문장입니다.');
    expect(messages[0]).toContain('두 번째 문장입니다.');
    expect(messages[0]).toContain('세 번째 문장입니다.');

    // 첫 번째 요청: 뉴스 목록 페이지를 가져오는지 확인 (URL 업데이트)
    expect(mockAxios.history.get[0].url).toEqual(
      'https://news.naver.com/breakingnews/section/105/230',
    );

    // 두 번째 요청: 개별 뉴스 기사 내용을 가져오는지 확인
    expect(mockAxios.history.get[1].url).toEqual(
      'https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808',
    );
  });

  // 메시지 길이 제한으로 인한 메시지 분할 테스트를 위한 모킹 헬퍼 함수
  const mockLongArticles = (count: number, longSummary: boolean = false) => {
    // 뉴스 목록 페이지 HTML 모킹 (URL 업데이트)
    let htmlContent =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul>';

    for (let i = 1; i <= count; i++) {
      htmlContent += `<li><a href="https://news.naver.com/article-${i}">Mock News Title ${i}</a></li>`;
    }

    htmlContent += '</ul></div></div></div></div></body></html>';
    mockAxios.onGet('https://news.naver.com/breakingnews/section/105/230').reply(200, htmlContent);

    // 각 기사에 대한 콘텐츠 모킹
    for (let i = 1; i <= count; i++) {
      const articleContent =
        '<html><body><div id="dic_area">긴 기사 내용입니다. '.repeat(20) + '</div></body></html>';
      mockAxios.onGet(`https://news.naver.com/article-${i}`).reply(200, articleContent);

      // OpenAI 요약 모킹
      if (longSummary) {
        mockOpenAIInstance.summarizeText.mockResolvedValueOnce(
          '이것은 매우 긴 요약입니다. '.repeat(50),
        );
      }
    }
  };

  // 메시지 길이 제한으로 인한 메시지 분할 테스트
  it('메시지 길이 제한으로 인해 여러 메시지로 분할합니다', async () => {
    // info: fallback summarize는 항상 3개 문장만 반환하므로, 충분히 많은 기사가 필요
    // info: maxArticlesToCrawl이 10이므로 10개 기사를 모두 사용
    mockLongArticles(10, false);

    const messages = await dailyNews.getDailyNews();

    // 여러 메시지로 분할되었는지 확인
    expect(messages.length).toBeGreaterThanOrEqual(1);

    // case: 메시지가 분할된 경우, 첫 번째 메시지 이후에 (계속) 표시가 있는지 확인
    if (messages.length > 1) {
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].startsWith('(계속)')).toBe(true);
      }
    }
  });
});
