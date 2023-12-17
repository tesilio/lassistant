import { DailyNews } from '../DailyNews';
import axios from 'axios';
import * as MockAdapter from 'axios-mock-adapter';

describe('DailyNews', () => {
  let mockAxios: MockAdapter;
  let dailyNews: DailyNews;

  // 각 테스트 전에 실행됩니다.
  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    dailyNews = new DailyNews();
  });

  // 각 테스트 후에 실행됩니다.
  afterEach(() => {
    mockAxios.restore();
  });

  // 'getDailyNews' 메서드가 일일 뉴스를 가져오는지 테스트합니다.
  it('일일 뉴스를 가져옵니다', async () => {
    const mockHtml = '<html><body><div id="main_content"><div class="list_body newsflash_body"><ul class="type06_headline"><li><a href="https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808">Mock News Title</a></li></ul></div></div></body></html>';
    const expectedNews = '- [Mock News Title](https://news.naver.com/main/read.naver?mode=LS2D&mid=shm&sid1=105&sid2=230&oid=001&aid=0012576808)';
    mockAxios.onGet().reply(200, mockHtml);

    const news = await dailyNews.getDailyNews();
    expect(news).toEqual(expectedNews);
  });
});
