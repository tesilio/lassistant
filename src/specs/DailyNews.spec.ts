import { DailyNews } from '../DailyNews';
import axios from 'axios';
import * as MockAdapter from 'axios-mock-adapter';
import RedisManager from '../RedisManager';
import OpenAIManager from '../OpenAIManager';

// RedisManager 모킹
jest.mock('../RedisManager', () => {
  return {
    default: {
      getInstance: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

// OpenAIManager 모킹
jest.mock('../OpenAIManager', () => {
  return {
    default: {
      getInstance: jest.fn().mockReturnValue({
        summarizeText: jest.fn().mockResolvedValue('OpenAI로 요약된 내용입니다.'),
      }),
    },
  };
});

describe('DailyNews', () => {
  let mockAxios: MockAdapter;
  let dailyNews: DailyNews;

  // 각 테스트 전에 실행됩니다.
  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    dailyNews = new DailyNews();
    // 모킹 초기화
    jest.clearAllMocks();
  });

  // 각 테스트 후에 실행됩니다.
  afterEach(() => {
    mockAxios.restore();
  });

  // 'getDailyNews' 메서드가 일일 뉴스를 가져오는지 테스트합니다.
  it('일일 뉴스를 가져옵니다', async () => {
    // 뉴스 목록 페이지 HTML 모킹
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
    expect(messages[0]).toContain('OpenAI로 요약된 내용입니다.');

    // 첫 번째 요청: 뉴스 목록 페이지를 가져오는지 확인
    expect(mockAxios.history.get[0].url).toEqual(
      'https://news.naver.com/breakingnews/section/105/230',
    );

    // 두 번째 요청: 개별 뉴스 기사 내용을 가져오는지 확인
    expect(mockAxios.history.get[1].url).toEqual(
      'https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808',
    );

    // OpenAIManager가 호출되었는지 확인
    expect(OpenAIManager.getInstance().summarizeText).toHaveBeenCalled();

    // 캐시에 메시지 배열이 저장되었는지 확인
    expect(RedisManager.getInstance().set).toHaveBeenCalledWith(
      expect.stringContaining('dailyNews'),
      expect.any(String),
      expect.any(Number),
    );
  });

  // 캐시된 뉴스를 가져오는 테스트
  it('캐시된 뉴스를 가져옵니다', async () => {
    const cachedMessages = ['Cached news 1', 'Cached news 2'];
    // RedisManager의 get 메서드가 캐시된 값을 반환하도록 설정
    (RedisManager.getInstance() as any).get.mockResolvedValueOnce(JSON.stringify(cachedMessages));

    const messages = await dailyNews.getDailyNews();

    // 캐시에서 가져온 메시지와 일치하는지 확인
    expect(messages).toEqual(cachedMessages);
    // axios가 호출되지 않았는지 확인 (캐시에서만 데이터를 가져왔는지)
    expect(mockAxios.history.get.length).toBe(0);
    // OpenAIManager가 호출되지 않았는지 확인
    expect(OpenAIManager.getInstance().summarizeText).not.toHaveBeenCalled();
  });

  // 캐시된 메시지 파싱 실패 테스트
  it('캐시된 메시지 파싱 실패 시 새로운 뉴스를 가져옵니다', async () => {
    // 잘못된 형식의 JSON 캐시 데이터 설정
    (RedisManager.getInstance() as any).get.mockResolvedValueOnce('{invalid json}');

    // 뉴스 목록 페이지 HTML 모킹
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

    // 파싱 실패 시 새로운 뉴스를 가져왔는지 확인
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);

    // axios가 호출되었는지 확인 (새로운 데이터를 가져왔는지)
    expect(mockAxios.history.get.length).toBeGreaterThan(0);
  });

  // 메시지 길이 제한으로 인한 메시지 분할 테스트를 위한 모킹 헬퍼 함수
  const mockLongArticles = (count: number, longSummary: boolean = false) => {
    // 뉴스 목록 페이지 HTML 모킹
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
        (OpenAIManager.getInstance().summarizeText as jest.Mock).mockResolvedValueOnce(
          '이것은 매우 긴 요약입니다. '.repeat(50),
        );
      }
    }
  };

  // 메시지 길이 제한으로 인한 메시지 분할 테스트
  it('메시지 길이 제한으로 인해 여러 메시지로 분할합니다', async () => {
    // 여러 기사와 긴 요약으로 모킹
    mockLongArticles(5, true);

    const messages = await dailyNews.getDailyNews();

    // 여러 메시지로 분할되었는지 확인
    expect(messages.length).toBeGreaterThan(1);

    // 첫 번째 메시지 이후 메시지에 (계속) 표시가 있는지 확인
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i].startsWith('(계속)')).toBe(true);
    }
  });
});
