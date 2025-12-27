import dayjs from 'dayjs';
import environment from '../config/environment';
import { getSkyConditionText, getPrecipitationTypeText } from './utils/weatherUtils';
import { BaseAPIManager } from './services/base/BaseAPIManager';
import { UltraShortWeather, ShortTermWeather, KMAResponse, KMAResponseItem } from './types/weather';

export { UltraShortWeather, ShortTermWeather };

export default class WeatherAPIManager extends BaseAPIManager {
  private static instance: WeatherAPIManager;
  private readonly baseUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
  private readonly apiKey: string;
  protected readonly serviceName = '기상청';

  private constructor() {
    super();
    this.apiKey = environment.weather.dataGoApiKey;
  }

  public static getInstance(): WeatherAPIManager {
    if (!WeatherAPIManager.instance) {
      WeatherAPIManager.instance = new WeatherAPIManager();
    }
    return WeatherAPIManager.instance;
  }

  public static resetInstance(): void {
    WeatherAPIManager.instance = undefined as unknown as WeatherAPIManager;
  }

  public async getUltraShortTermForecast(nx: number, ny: number): Promise<UltraShortWeather> {
    const now = dayjs();
    const baseDate = now.format('YYYYMMDD');
    const baseTime = now.subtract(1, 'hour').format('HH00');

    const params = {
      serviceKey: this.apiKey,
      pageNo: 1,
      numOfRows: 10,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    };

    const response = await this.retryRequest<KMAResponse>(async () => {
      return this.http.get(`${this.baseUrl}/getUltraSrtNcst`, { params });
    }, 3);

    const items = response.data.response.body.items.item;

    const result: UltraShortWeather = {
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      precipitation: 0,
      precipitationType: '없음',
      skyCondition: '알 수 없음',
    };

    items.forEach((item: KMAResponseItem) => {
      switch (item.category) {
        case 'T1H':
          result.temperature = parseFloat(item.obsrValue || '0');
          break;
        case 'REH':
          result.humidity = parseInt(item.obsrValue || '0', 10);
          break;
        case 'WSD':
          result.windSpeed = parseFloat(item.obsrValue || '0');
          break;
        case 'RN1':
          result.precipitation = parseFloat(item.obsrValue || '0');
          break;
        case 'PTY':
          result.precipitationType = getPrecipitationTypeText(item.obsrValue || '0');
          break;
      }
    });

    return result;
  }

  public async getShortTermForecast(nx: number, ny: number): Promise<ShortTermWeather> {
    const now = dayjs();
    const currentHour = now.hour();
    let baseTime: string;
    let baseDate = now.format('YYYYMMDD');

    if (currentHour < 2) {
      baseTime = '2300';
      baseDate = now.subtract(1, 'day').format('YYYYMMDD');
    } else if (currentHour < 5) {
      baseTime = '0200';
    } else if (currentHour < 8) {
      baseTime = '0500';
    } else if (currentHour < 11) {
      baseTime = '0800';
    } else if (currentHour < 14) {
      baseTime = '1100';
    } else if (currentHour < 17) {
      baseTime = '1400';
    } else if (currentHour < 20) {
      baseTime = '1700';
    } else if (currentHour < 23) {
      baseTime = '2000';
    } else {
      baseTime = '2300';
    }

    const params = {
      serviceKey: this.apiKey,
      pageNo: 1,
      numOfRows: 300,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    };

    const response = await this.retryRequest<KMAResponse>(async () => {
      return this.http.get(`${this.baseUrl}/getVilageFcst`, { params });
    }, 3);

    const items = response.data.response.body.items.item;
    const today = now.format('YYYYMMDD');
    const todayItems = items.filter((item: KMAResponseItem) => item.fcstDate === today);

    const result: ShortTermWeather = {
      minTemp: 0,
      maxTemp: 0,
      morningPrecipProb: 0,
      afternoonPrecipProb: 0,
      eveningPrecipProb: 0,
      morningCondition: '알 수 없음',
      afternoonCondition: '알 수 없음',
      eveningCondition: '알 수 없음',
      morningPrecipType: '없음',
      afternoonPrecipType: '없음',
      eveningPrecipType: '없음',
    };

    const tmnItem = items.find((item: KMAResponseItem) => item.category === 'TMN');
    const tmxItem = items.find((item: KMAResponseItem) => item.category === 'TMX');

    if (tmnItem) {
      result.minTemp = parseFloat(tmnItem.fcstValue || '0');
    }
    if (tmxItem) {
      result.maxTemp = parseFloat(tmxItem.fcstValue || '0');
    }

    const morningTimes = ['0600', '0700', '0800', '0900', '1000', '1100'];
    const afternoonTimes = ['1200', '1300', '1400', '1500', '1600', '1700'];
    const eveningTimes = ['1800', '1900', '2000', '2100', '2200', '2300'];

    todayItems.forEach((item: KMAResponseItem) => {
      const fcstTime = item.fcstTime || '';
      const fcstValue = item.fcstValue || '';

      switch (item.category) {
        case 'POP':
          if (morningTimes.includes(fcstTime)) {
            result.morningPrecipProb = Math.max(result.morningPrecipProb, parseInt(fcstValue, 10));
          } else if (afternoonTimes.includes(fcstTime)) {
            result.afternoonPrecipProb = Math.max(
              result.afternoonPrecipProb,
              parseInt(fcstValue, 10),
            );
          } else if (eveningTimes.includes(fcstTime)) {
            result.eveningPrecipProb = Math.max(result.eveningPrecipProb, parseInt(fcstValue, 10));
          }
          break;
        case 'SKY':
          const skyText = getSkyConditionText(fcstValue);
          if (morningTimes.includes(fcstTime) && result.morningCondition === '알 수 없음') {
            result.morningCondition = skyText;
          } else if (
            afternoonTimes.includes(fcstTime) &&
            result.afternoonCondition === '알 수 없음'
          ) {
            result.afternoonCondition = skyText;
          } else if (eveningTimes.includes(fcstTime) && result.eveningCondition === '알 수 없음') {
            result.eveningCondition = skyText;
          }
          break;
        case 'PTY':
          const precipText = getPrecipitationTypeText(fcstValue);
          if (fcstValue === '0') break;

          if (morningTimes.includes(fcstTime)) {
            result.morningPrecipType = precipText;
          } else if (afternoonTimes.includes(fcstTime)) {
            result.afternoonPrecipType = precipText;
          } else if (eveningTimes.includes(fcstTime)) {
            result.eveningPrecipType = precipText;
          }
          break;
      }
    });

    return result;
  }
}
