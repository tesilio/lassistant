import { default as axios, AxiosResponse } from 'axios';
import dayjs from 'dayjs';
import environment from '../config/environment';
import { getSkyConditionText, getPrecipitationTypeText } from './utils/weatherUtils';

/**
 * 초단기실황 날씨 정보 인터페이스
 */
export interface UltraShortWeather {
  temperature: number; // 기온 (°C)
  humidity: number; // 습도 (%)
  windSpeed: number; // 풍속 (m/s)
  precipitation: number; // 1시간 강수량 (mm)
  precipitationType: string; // 강수 형태
  skyCondition: string; // 하늘상태
}

/**
 * 단기예보 날씨 정보 인터페이스
 */
export interface ShortTermWeather {
  minTemp: number; // 최저기온
  maxTemp: number; // 최고기온
  morningPrecipProb: number; // 오전 강수확률 (%)
  afternoonPrecipProb: number; // 오후 강수확률 (%)
  eveningPrecipProb: number; // 저녁 강수확률 (%)
  morningCondition: string; // 오전 하늘상태
  afternoonCondition: string; // 오후 하늘상태
  eveningCondition: string; // 저녁 하늘상태
  morningPrecipType: string; // 오전 강수형태
  afternoonPrecipType: string; // 오후 강수형태
  eveningPrecipType: string; // 저녁 강수형태
}

/**
 * 기상청 API 응답 아이템 인터페이스
 */
interface KMAResponseItem {
  category: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
  baseDate: string;
  baseTime: string;
  nx: number;
  ny: number;
  obsrValue?: string;
}

/**
 * 기상청 API 응답 인터페이스
 */
interface KMAResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      dataType: string;
      items: {
        item: KMAResponseItem[];
      };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

/**
 * 기상청 API 관리자 클래스 (싱글톤)
 */
export default class WeatherAPIManager {
  private static instance: WeatherAPIManager;
  private readonly baseUrl = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
  private readonly apiKey: string;

  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.apiKey = environment.weather.dataGoApiKey;
  }

  /**
   * 싱글톤 인스턴스 반환
   * @returns {WeatherAPIManager}
   */
  public static getInstance(): WeatherAPIManager {
    if (!WeatherAPIManager.instance) {
      WeatherAPIManager.instance = new WeatherAPIManager();
    }
    return WeatherAPIManager.instance;
  }

  /**
   * 초단기실황 조회 (현재 날씨)
   * @async
   * @param {number} nx - 격자 X 좌표
   * @param {number} ny - 격자 Y 좌표
   * @returns {Promise<UltraShortWeather>} 초단기실황 날씨 정보
   */
  public async getUltraShortTermForecast(
    nx: number,
    ny: number
  ): Promise<UltraShortWeather> {
    const now = dayjs();
    const baseDate = now.format('YYYYMMDD');
    // info: 초단기실황은 매시간 30분에 생성되므로, 현재 시각 기준 이전 정시 사용
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

    const response = await this.retryRequest<AxiosResponse<KMAResponse>>(async () => {
      return axios.get(`${this.baseUrl}/getUltraSrtNcst`, { params });
    }, 3);

    const items = response.data.response.body.items.item;

    // info: 응답 데이터에서 필요한 값 추출
    const result: UltraShortWeather = {
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      precipitation: 0,
      precipitationType: '없음',
      skyCondition: '알 수 없음',
    };

    items.forEach((item) => {
      switch (item.category) {
        case 'T1H': // 기온
          result.temperature = parseFloat(item.obsrValue || '0');
          break;
        case 'REH': // 습도
          result.humidity = parseInt(item.obsrValue || '0', 10);
          break;
        case 'WSD': // 풍속
          result.windSpeed = parseFloat(item.obsrValue || '0');
          break;
        case 'RN1': // 1시간 강수량
          result.precipitation = parseFloat(item.obsrValue || '0');
          break;
        case 'PTY': // 강수형태
          result.precipitationType = getPrecipitationTypeText(item.obsrValue || '0');
          break;
      }
    });

    return result;
  }

  /**
   * 단기예보 조회 (오늘/내일 예보)
   * @async
   * @param {number} nx - 격자 X 좌표
   * @param {number} ny - 격자 Y 좌표
   * @returns {Promise<ShortTermWeather>} 단기예보 날씨 정보
   */
  public async getShortTermForecast(nx: number, ny: number): Promise<ShortTermWeather> {
    const now = dayjs();
    // info: 단기예보는 02, 05, 08, 11, 14, 17, 20, 23시에 생성
    // 현재 시각 기준 가장 최근 발표 시각 계산
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

    const response = await this.retryRequest<AxiosResponse<KMAResponse>>(async () => {
      return axios.get(`${this.baseUrl}/getVilageFcst`, { params });
    }, 3);

    const items = response.data.response.body.items.item;
    const today = now.format('YYYYMMDD');

    // info: 오늘 날짜의 예보만 필터링
    const todayItems = items.filter((item) => item.fcstDate === today);

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

    todayItems.forEach((item) => {
      const fcstTime = item.fcstTime || '';
      const fcstValue = item.fcstValue || '';

      switch (item.category) {
        case 'TMN': // 최저기온
          result.minTemp = parseFloat(fcstValue);
          break;
        case 'TMX': // 최고기온
          result.maxTemp = parseFloat(fcstValue);
          break;
        case 'POP': // 강수확률
          // case: 오전 (06-12시)
          if (fcstTime >= '0600' && fcstTime < '1200') {
            result.morningPrecipProb = Math.max(
              result.morningPrecipProb,
              parseInt(fcstValue, 10)
            );
          }
          // case: 오후 (12-18시)
          else if (fcstTime >= '1200' && fcstTime < '1800') {
            result.afternoonPrecipProb = Math.max(
              result.afternoonPrecipProb,
              parseInt(fcstValue, 10)
            );
          }
          // case: 저녁 (18-24시)
          else if (fcstTime >= '1800') {
            result.eveningPrecipProb = Math.max(
              result.eveningPrecipProb,
              parseInt(fcstValue, 10)
            );
          }
          break;
        case 'SKY': // 하늘상태
          const skyText = getSkyConditionText(fcstValue);
          // case: 오전 (09시 기준)
          if (fcstTime === '0900') {
            result.morningCondition = skyText;
          }
          // case: 오후 (15시 기준)
          else if (fcstTime === '1500') {
            result.afternoonCondition = skyText;
          }
          // case: 저녁 (21시 기준)
          else if (fcstTime === '2100') {
            result.eveningCondition = skyText;
          }
          break;
        case 'PTY': // 강수형태
          const precipText = getPrecipitationTypeText(fcstValue);
          // case: 오전 (09시 기준)
          if (fcstTime === '0900' && fcstValue !== '0') {
            result.morningPrecipType = precipText;
          }
          // case: 오후 (15시 기준)
          else if (fcstTime === '1500' && fcstValue !== '0') {
            result.afternoonPrecipType = precipText;
          }
          // case: 저녁 (21시 기준)
          else if (fcstTime === '2100' && fcstValue !== '0') {
            result.eveningPrecipType = precipText;
          }
          break;
      }
    });

    return result;
  }

  /**
   * API 재시도 로직 (최대 3회, 지수 백오프)
   * @async
   * @private
   * @template T
   * @param {() => Promise<T>} fn - 재시도할 함수
   * @param {number} maxRetries - 최대 재시도 횟수
   * @returns {Promise<T>}
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.error(`API 호출 실패 (시도 ${attempt + 1}/${maxRetries}):`, error);

        // case: 마지막 시도가 아니면 대기 후 재시도
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 지수 백오프: 1초, 2초, 4초
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
