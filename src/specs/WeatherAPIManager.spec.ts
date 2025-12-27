// info: httpClient 모듈을 모킹하여 BaseAPIManager의 this.http를 제어합니다.
jest.mock('../infrastructure/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import { httpClient } from '../infrastructure/httpClient';
import dayjs from 'dayjs';
import WeatherAPIManager from '../WeatherAPIManager';

const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('WeatherAPIManager', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      DATA_GO_API_KEY: 'test-api-key',
      WEATHER_NX: '61',
      WEATHER_NY: '126',
      WEATHER_STATION: '삼성동',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    (mockedHttpClient.get as jest.Mock).mockReset();
    WeatherAPIManager.resetInstance();
  });

  describe('getInstance', () => {
    it('싱글톤 인스턴스를 반환해야 합니다', () => {
      const instance1 = WeatherAPIManager.getInstance();
      const instance2 = WeatherAPIManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getUltraShortTermForecast', () => {
    const mockUltraShortResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            dataType: 'JSON',
            items: {
              item: [
                {
                  category: 'T1H',
                  obsrValue: '15.5',
                  baseDate: '20251227',
                  baseTime: '0700',
                  nx: 61,
                  ny: 126,
                },
                {
                  category: 'REH',
                  obsrValue: '65',
                  baseDate: '20251227',
                  baseTime: '0700',
                  nx: 61,
                  ny: 126,
                },
                {
                  category: 'WSD',
                  obsrValue: '2.3',
                  baseDate: '20251227',
                  baseTime: '0700',
                  nx: 61,
                  ny: 126,
                },
                {
                  category: 'RN1',
                  obsrValue: '0',
                  baseDate: '20251227',
                  baseTime: '0700',
                  nx: 61,
                  ny: 126,
                },
                {
                  category: 'PTY',
                  obsrValue: '0',
                  baseDate: '20251227',
                  baseTime: '0700',
                  nx: 61,
                  ny: 126,
                },
              ],
            },
            pageNo: 1,
            numOfRows: 10,
            totalCount: 5,
          },
        },
      },
    };

    it('초단기실황 데이터를 올바르게 파싱해야 합니다', async () => {
      (mockedHttpClient.get as jest.Mock).mockResolvedValueOnce(mockUltraShortResponse);
      const weatherManager = WeatherAPIManager.getInstance();

      const result = await weatherManager.getUltraShortTermForecast(61, 126);

      expect(result.temperature).toBe(15.5);
      expect(result.humidity).toBe(65);
      expect(result.windSpeed).toBe(2.3);
      expect(result.precipitation).toBe(0);
      expect(result.precipitationType).toBe('없음');
    });

    it('강수 형태가 비일 때 올바르게 파싱해야 합니다', async () => {
      const rainyResponse = {
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
            body: {
              dataType: 'JSON',
              items: {
                item: [
                  {
                    category: 'T1H',
                    obsrValue: '10',
                    baseDate: '20251227',
                    baseTime: '0700',
                    nx: 61,
                    ny: 126,
                  },
                  {
                    category: 'REH',
                    obsrValue: '80',
                    baseDate: '20251227',
                    baseTime: '0700',
                    nx: 61,
                    ny: 126,
                  },
                  {
                    category: 'WSD',
                    obsrValue: '3',
                    baseDate: '20251227',
                    baseTime: '0700',
                    nx: 61,
                    ny: 126,
                  },
                  {
                    category: 'PTY',
                    obsrValue: '1',
                    baseDate: '20251227',
                    baseTime: '0700',
                    nx: 61,
                    ny: 126,
                  },
                  {
                    category: 'RN1',
                    obsrValue: '5.5',
                    baseDate: '20251227',
                    baseTime: '0700',
                    nx: 61,
                    ny: 126,
                  },
                ],
              },
              pageNo: 1,
              numOfRows: 10,
              totalCount: 5,
            },
          },
        },
      };

      (mockedHttpClient.get as jest.Mock).mockResolvedValueOnce(rainyResponse);
      const weatherManager = WeatherAPIManager.getInstance();

      const result = await weatherManager.getUltraShortTermForecast(61, 126);

      expect(result.precipitationType).toBe('비 🌧️');
      expect(result.precipitation).toBe(5.5);
    });
  });

  describe('getShortTermForecast', () => {
    const today = dayjs().format('YYYYMMDD');

    const createShortTermResponse = (items: object[]) => ({
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
          body: {
            dataType: 'JSON',
            items: { item: items },
            pageNo: 1,
            numOfRows: 300,
            totalCount: items.length,
          },
        },
      },
    });

    it('단기예보 데이터를 올바르게 파싱해야 합니다', async () => {
      const items = [
        {
          category: 'TMN',
          fcstValue: '5',
          fcstDate: today,
          fcstTime: '0600',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'TMX',
          fcstValue: '15',
          fcstDate: today,
          fcstTime: '1500',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'POP',
          fcstValue: '30',
          fcstDate: today,
          fcstTime: '0900',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'POP',
          fcstValue: '60',
          fcstDate: today,
          fcstTime: '1500',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'POP',
          fcstValue: '20',
          fcstDate: today,
          fcstTime: '2100',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'SKY',
          fcstValue: '1',
          fcstDate: today,
          fcstTime: '0900',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'SKY',
          fcstValue: '3',
          fcstDate: today,
          fcstTime: '1500',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'SKY',
          fcstValue: '4',
          fcstDate: today,
          fcstTime: '2100',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
      ];

      (mockedHttpClient.get as jest.Mock).mockResolvedValueOnce(createShortTermResponse(items));
      const weatherManager = WeatherAPIManager.getInstance();

      const result = await weatherManager.getShortTermForecast(61, 126);

      expect(result.minTemp).toBe(5);
      expect(result.maxTemp).toBe(15);
      expect(result.morningPrecipProb).toBe(30);
      expect(result.afternoonPrecipProb).toBe(60);
      expect(result.eveningPrecipProb).toBe(20);
      expect(result.morningCondition).toBe('맑음 ☀️');
      expect(result.afternoonCondition).toBe('구름많음 ⛅');
      expect(result.eveningCondition).toBe('흐림 ☁️');
    });

    it('강수 형태가 있을 때 올바르게 파싱해야 합니다', async () => {
      const items = [
        {
          category: 'TMN',
          fcstValue: '0',
          fcstDate: today,
          fcstTime: '0600',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'TMX',
          fcstValue: '5',
          fcstDate: today,
          fcstTime: '1500',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'PTY',
          fcstValue: '3',
          fcstDate: today,
          fcstTime: '0900',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
      ];

      (mockedHttpClient.get as jest.Mock).mockResolvedValueOnce(createShortTermResponse(items));
      const weatherManager = WeatherAPIManager.getInstance();

      const result = await weatherManager.getShortTermForecast(61, 126);

      expect(result.morningPrecipType).toBe('눈 ❄️');
    });

    it('시간대별 강수확률 중 최대값을 반환해야 합니다', async () => {
      const items = [
        {
          category: 'POP',
          fcstValue: '10',
          fcstDate: today,
          fcstTime: '0600',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'POP',
          fcstValue: '50',
          fcstDate: today,
          fcstTime: '0900',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
        {
          category: 'POP',
          fcstValue: '30',
          fcstDate: today,
          fcstTime: '1100',
          baseDate: today,
          baseTime: '0500',
          nx: 61,
          ny: 126,
        },
      ];

      (mockedHttpClient.get as jest.Mock).mockResolvedValueOnce(createShortTermResponse(items));
      const weatherManager = WeatherAPIManager.getInstance();

      const result = await weatherManager.getShortTermForecast(61, 126);

      expect(result.morningPrecipProb).toBe(50);
    });

    it('데이터가 없을 때 기본값을 반환해야 합니다', async () => {
      (mockedHttpClient.get as jest.Mock).mockResolvedValueOnce(createShortTermResponse([]));
      const weatherManager = WeatherAPIManager.getInstance();

      const result = await weatherManager.getShortTermForecast(61, 126);

      expect(result.minTemp).toBe(0);
      expect(result.maxTemp).toBe(0);
      expect(result.morningCondition).toBe('알 수 없음');
    });
  });
});

describe('WeatherAPIManager - 재시도 로직', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      DATA_GO_API_KEY: 'test-api-key',
      WEATHER_NX: '61',
      WEATHER_NY: '126',
      WEATHER_STATION: '삼성동',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    (httpClient.get as jest.Mock).mockReset();
    WeatherAPIManager.resetInstance();
  });

  const mockUltraShortResponse = {
    data: {
      response: {
        header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
        body: {
          dataType: 'JSON',
          items: {
            item: [
              {
                category: 'T1H',
                obsrValue: '15.5',
                baseDate: '20251227',
                baseTime: '0700',
                nx: 61,
                ny: 126,
              },
              {
                category: 'REH',
                obsrValue: '65',
                baseDate: '20251227',
                baseTime: '0700',
                nx: 61,
                ny: 126,
              },
              {
                category: 'WSD',
                obsrValue: '2.3',
                baseDate: '20251227',
                baseTime: '0700',
                nx: 61,
                ny: 126,
              },
              {
                category: 'RN1',
                obsrValue: '0',
                baseDate: '20251227',
                baseTime: '0700',
                nx: 61,
                ny: 126,
              },
              {
                category: 'PTY',
                obsrValue: '0',
                baseDate: '20251227',
                baseTime: '0700',
                nx: 61,
                ny: 126,
              },
            ],
          },
          pageNo: 1,
          numOfRows: 10,
          totalCount: 5,
        },
      },
    },
  };

  it(
    '3회 재시도 후에도 실패하면 에러를 throw해야 합니다',
    async () => {
      (httpClient.get as jest.Mock).mockRejectedValue(new Error('Server Error'));

      const weatherManager = WeatherAPIManager.getInstance();

      await expect(weatherManager.getUltraShortTermForecast(61, 126)).rejects.toThrow(
        'Server Error',
      );
      expect(httpClient.get).toHaveBeenCalledTimes(3);
    },
    10000,
  );

  it(
    'API 호출 실패 시 재시도해야 합니다',
    async () => {
      let callCount = 0;

      (httpClient.get as jest.Mock).mockImplementation(() => {
        callCount++;
        // case: 3번째 호출에서 성공
        if (callCount < 3) {
          return Promise.reject(new Error('Server Error'));
        }
        return Promise.resolve(mockUltraShortResponse);
      });

      const weatherManager = WeatherAPIManager.getInstance();
      const result = await weatherManager.getUltraShortTermForecast(61, 126);

      expect(callCount).toBe(3);
      expect(result.temperature).toBe(15.5);
    },
    10000,
  );
});
