jest.mock('../WeatherAPIManager');
jest.mock('../AirKoreaManager');
jest.mock('../OpenAIManager');

import { DailyWeather } from '../DailyWeather';
import WeatherAPIManager, { UltraShortWeather, ShortTermWeather } from '../WeatherAPIManager';
import AirKoreaManager, { AirQualityInfo } from '../AirKoreaManager';
import OpenAIManager from '../OpenAIManager';

describe('DailyWeather', () => {
  const mockCurrentWeather: UltraShortWeather = {
    temperature: 5,
    humidity: 60,
    windSpeed: 2.5,
    precipitation: 0,
    precipitationType: '없음',
    skyCondition: '맑음',
  };

  const mockForecast: ShortTermWeather = {
    minTemp: 2,
    maxTemp: 10,
    morningCondition: '맑음',
    morningPrecipType: '없음',
    morningPrecipProb: 10,
    afternoonCondition: '구름많음',
    afternoonPrecipType: '없음',
    afternoonPrecipProb: 20,
    eveningCondition: '흐림',
    eveningPrecipType: '없음',
    eveningPrecipProb: 30,
  };

  const mockAirQuality: AirQualityInfo = {
    pm10Value: 45,
    pm10Grade: 2,
    pm25Value: 25,
    pm25Grade: 2,
    khaiValue: 75,
    khaiGrade: 2,
    pm10GradeText: '보통',
    pm25GradeText: '보통',
    khaiGradeText: '보통',
    pm10GradeEmoji: '🟡',
    pm25GradeEmoji: '🟡',
    khaiGradeEmoji: '🟡',
  };

  let mockWeatherManagerInstance: {
    getUltraShortTermForecast: jest.Mock;
    getShortTermForecast: jest.Mock;
  };

  let mockAirKoreaManagerInstance: {
    getAirQuality: jest.Mock;
  };

  let mockOpenAIManagerInstance: {
    generateClothingAdvice: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockWeatherManagerInstance = {
      getUltraShortTermForecast: jest.fn().mockResolvedValue(mockCurrentWeather),
      getShortTermForecast: jest.fn().mockResolvedValue(mockForecast),
    };

    mockAirKoreaManagerInstance = {
      getAirQuality: jest.fn().mockResolvedValue(mockAirQuality),
    };

    mockOpenAIManagerInstance = {
      generateClothingAdvice: jest.fn().mockResolvedValue('오늘은 따뜻하게 입으세요.'),
    };

    (WeatherAPIManager.getInstance as jest.Mock).mockReturnValue(mockWeatherManagerInstance);
    (AirKoreaManager.getInstance as jest.Mock).mockReturnValue(mockAirKoreaManagerInstance);
    (OpenAIManager.getInstance as jest.Mock).mockReturnValue(mockOpenAIManagerInstance);
  });

  describe('getDailyWeather', () => {
    it('날씨 정보를 수집하고 메시지를 반환해야 한다', async () => {
      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('서울 강남구 삼성동 날씨');
      expect(messages[0]).toContain('현재 날씨');
      expect(messages[0]).toContain('5℃');
      expect(messages[0]).toContain('맑음');
      expect(messages[0]).toContain('오늘 예보');
      expect(messages[0]).toContain('2℃ / 10℃');
      expect(messages[0]).toContain('대기질');
      expect(messages[0]).toContain('옷차림 추천');
      expect(messages[0]).toContain('오늘은 따뜻하게 입으세요.');
    });

    it('강수 타입이 있을 때 메시지에 포함해야 한다', async () => {
      mockWeatherManagerInstance.getUltraShortTermForecast.mockResolvedValueOnce({
        ...mockCurrentWeather,
        precipitationType: '비',
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('강수: 비');
    });

    it('시간대별 강수 타입이 있을 때 표시해야 한다', async () => {
      mockWeatherManagerInstance.getShortTermForecast.mockResolvedValueOnce({
        ...mockForecast,
        morningPrecipType: '비',
        afternoonPrecipType: '눈',
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('오전 (06-12시): 맑음 (비)');
      expect(messages[0]).toContain('오후 (12-18시): 구름많음 (눈)');
    });

    it('OpenAI 실패 시 fallback 옷차림 추천을 사용해야 한다', async () => {
      mockOpenAIManagerInstance.generateClothingAdvice.mockRejectedValueOnce(new Error('API 오류'));

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('옷차림 추천');
      expect(messages[0]).not.toContain('오늘은 따뜻하게 입으세요.');
    });

    it('날씨 API 실패 시 에러를 던져야 한다', async () => {
      mockWeatherManagerInstance.getUltraShortTermForecast.mockRejectedValueOnce(
        new Error('API 오류'),
      );

      const dailyWeather = new DailyWeather();

      await expect(dailyWeather.getDailyWeather()).rejects.toThrow('API 오류');
    });

    it('대기질 API 실패 시 에러를 던져야 한다', async () => {
      mockAirKoreaManagerInstance.getAirQuality.mockRejectedValueOnce(new Error('대기질 API 오류'));

      const dailyWeather = new DailyWeather();

      await expect(dailyWeather.getDailyWeather()).rejects.toThrow('대기질 API 오류');
    });
  });

  describe('fallback 옷차림 추천', () => {
    beforeEach(() => {
      mockOpenAIManagerInstance.generateClothingAdvice.mockRejectedValue(new Error('API 오류'));
    });

    it('체감온도 4도 이하일 때 패딩 추천', async () => {
      mockWeatherManagerInstance.getUltraShortTermForecast.mockResolvedValueOnce({
        ...mockCurrentWeather,
        temperature: 0,
        windSpeed: 5,
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('패딩');
    });

    it('체감온도 5-8도일 때 코트 추천', async () => {
      mockWeatherManagerInstance.getUltraShortTermForecast.mockResolvedValueOnce({
        ...mockCurrentWeather,
        temperature: 7,
        windSpeed: 1,
        humidity: 50,
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('코트');
    });

    it('체감온도 28도 이상일 때 민소매 추천', async () => {
      mockWeatherManagerInstance.getUltraShortTermForecast.mockResolvedValueOnce({
        ...mockCurrentWeather,
        temperature: 30,
        humidity: 70,
      });
      mockWeatherManagerInstance.getShortTermForecast.mockResolvedValueOnce({
        ...mockForecast,
        minTemp: 25,
        maxTemp: 33,
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('민소매');
    });

    it('일교차가 8도 이상일 때 겉옷 준비 권장', async () => {
      mockWeatherManagerInstance.getShortTermForecast.mockResolvedValueOnce({
        ...mockForecast,
        minTemp: 5,
        maxTemp: 20,
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('일교차가 크니 겉옷을 준비하세요');
    });

    it('미세먼지 나쁨 이상일 때 마스크 권장', async () => {
      mockAirKoreaManagerInstance.getAirQuality.mockResolvedValueOnce({
        ...mockAirQuality,
        pm10Grade: 3,
      });

      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('마스크');
    });
  });

  describe('체감온도 계산 통합', () => {
    it('체감온도가 메시지에 포함되어야 한다', async () => {
      const dailyWeather = new DailyWeather();
      const messages = await dailyWeather.getDailyWeather();

      expect(messages[0]).toContain('체감온도:');
    });
  });
});
