import { DailyNews } from '../DailyNews';
import axios from 'axios';
import * as MockAdapter from 'axios-mock-adapter';
import RedisManager from '../RedisManager';

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

describe('DailyNews', () => {
  let mockAxios: MockAdapter;
  let dailyNews: DailyNews;

  // 각 테스트 전에 실행됩니다.
  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    dailyNews = new DailyNews();
    // RedisManager 모킹 초기화
    jest.clearAllMocks();
  });

  // 각 테스트 후에 실행됩니다.
  afterEach(() => {
    mockAxios.restore();
  });

  // 'getDailyNews' 메서드가 일일 뉴스를 가져오는지 테스트합니다.
  it('일일 뉴스를 가져옵니다', async () => {
    const mockHtml =
      '<html><body><div id="newsct"><div class="section_latest"><div><div class="section_latest_article _CONTENT_LIST _PERSIST_META"><ul><li><a href="https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808">Mock News Title</a></li></ul></div></div></div></div></body></html>';
    const expectedNews = '- [Mock News Title](https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808)';
    mockAxios.onGet().reply(200, mockHtml);

    const news = await dailyNews.getDailyNews();

    expect(news).toEqual(expectedNews);
  });

  // 캐시된 뉴스를 가져오는 테스트
  it('캐시된 뉴스를 가져옵니다', async () => {
    const cachedNews = 'Cached news';
    // RedisManager의 get 메서드가 캐시된 값을 반환하도록 설정
    (RedisManager.getInstance() as any).get.mockResolvedValueOnce(cachedNews);

    const news = await dailyNews.getDailyNews();

    expect(news).toEqual(cachedNews);
    // axios가 호출되지 않았는지 확인
    expect(mockAxios.history.get.length).toBe(0);
  });
});
