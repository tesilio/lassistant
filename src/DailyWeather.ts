import dayjs from 'dayjs';
import environment from '../config/environment';
import WeatherAPIManager, { UltraShortWeather, ShortTermWeather } from './WeatherAPIManager';
import AirKoreaManager, { AirQualityInfo } from './AirKoreaManager';
import OpenAIManager from './OpenAIManager';
import { calculateFeelsLikeTemp } from './utils/weatherUtils';
import { logger } from './infrastructure/logger';

/**
 * 통합 날씨 데이터 인터페이스
 */
export interface WeatherData {
  current: UltraShortWeather;
  forecast: ShortTermWeather;
  airQuality: AirQualityInfo;
  feelsLikeTemp: number;
  clothingAdvice: string;
}

/**
 * 날씨 정보 수집 및 메시지 생성 클래스
 */
export class DailyWeather {
  private readonly nx: number;
  private readonly ny: number;
  private readonly station: string;

  /**
   * 생성자
   */
  constructor() {
    this.nx = environment.weather.nx;
    this.ny = environment.weather.ny;
    this.station = environment.weather.station;
  }

  /**
   * 일일 날씨 정보를 가져옵니다.
   * @async
   * @returns {Promise<Array<string>>} 날씨 메시지 배열
   */
  async getDailyWeather(): Promise<Array<string>> {
    try {
      const weatherData = await this.collectWeatherData();
      return this.getMessagesForTelegram(weatherData);
    } catch (error) {
      logger.error('날씨 정보 수집 실패', error);
      throw error;
    }
  }

  /**
   * 모든 날씨 정보를 수집합니다.
   * @async
   * @private
   * @returns {Promise<WeatherData>} 통합 날씨 데이터
   */
  private async collectWeatherData(): Promise<WeatherData> {
    const weatherManager = WeatherAPIManager.getInstance();
    const airKoreaManager = AirKoreaManager.getInstance();
    const openAIManager = OpenAIManager.getInstance();

    // info: 기상청 API 호출 (현재 날씨 + 예보)
    const [current, forecast] = await Promise.all([
      weatherManager.getUltraShortTermForecast(this.nx, this.ny),
      weatherManager.getShortTermForecast(this.nx, this.ny),
    ]);

    // info: 에어코리아 API 호출 (대기질)
    const airQuality = await airKoreaManager.getAirQuality(this.station);

    // info: 체감온도 계산
    const feelsLikeTemp = calculateFeelsLikeTemp(
      current.temperature,
      current.windSpeed,
      current.humidity,
    );

    // info: OpenAI 옷차림 추천 (fallback 포함)
    let clothingAdvice: string;
    try {
      clothingAdvice = await openAIManager.generateClothingAdvice({
        currentTemp: current.temperature,
        feelsLikeTemp,
        minTemp: forecast.minTemp,
        maxTemp: forecast.maxTemp,
        morningPrecipProb: forecast.morningPrecipProb,
        afternoonPrecipProb: forecast.afternoonPrecipProb,
        eveningPrecipProb: forecast.eveningPrecipProb,
        skyCondition: current.skyCondition,
        pm10Grade: airQuality.pm10Grade,
      });
    } catch (error) {
      logger.error('OpenAI 옷차림 추천 실패, fallback 사용', error);
      clothingAdvice = this.generateFallbackClothingAdvice(
        feelsLikeTemp,
        forecast.minTemp,
        forecast.maxTemp,
        airQuality.pm10Grade,
      );
    }

    return {
      current,
      forecast,
      airQuality,
      feelsLikeTemp,
      clothingAdvice,
    };
  }

  /**
   * OpenAI 실패 시 사용할 fallback 옷차림 추천
   * @private
   * @param {number} feelsLikeTemp - 체감온도
   * @param {number} minTemp - 최저기온
   * @param {number} maxTemp - 최고기온
   * @param {number} pm10Grade - 미세먼지 등급
   * @returns {string} 옷차림 추천 텍스트
   */
  private generateFallbackClothingAdvice(
    feelsLikeTemp: number,
    minTemp: number,
    maxTemp: number,
    pm10Grade: number,
  ): string {
    let advice = '';

    // case: 체감온도 기반 옷차림
    if (feelsLikeTemp <= 4) {
      advice = '패딩, 두꺼운 코트, 목도리, 장갑을 착용하세요.';
    } else if (feelsLikeTemp <= 8) {
      advice = '코트, 가죽자켓, 히트텍, 니트, 레깅스를 추천합니다.';
    } else if (feelsLikeTemp <= 11) {
      advice = '트렌치코트, 야상, 재킷, 스타킹, 청바지를 추천합니다.';
    } else if (feelsLikeTemp <= 16) {
      advice = '자켓, 가디건, 청바지, 면바지를 추천합니다.';
    } else if (feelsLikeTemp <= 19) {
      advice = '얇은 가디건, 면바지, 긴팔 티셔츠를 추천합니다.';
    } else if (feelsLikeTemp <= 22) {
      advice = '긴팔 티셔츠, 블라우스, 면바지, 슬랙스를 추천합니다.';
    } else if (feelsLikeTemp <= 27) {
      advice = '반팔 티셔츠, 얇은 셔츠, 반바지, 면바지를 추천합니다.';
    } else {
      advice = '민소매, 반팔, 반바지, 원피스를 추천합니다.';
    }

    // case: 일교차 큰 경우
    const tempDiff = maxTemp - minTemp;
    if (tempDiff >= 8) {
      advice += ' 일교차가 크니 겉옷을 준비하세요.';
    }

    // case: 미세먼지 나쁨 이상
    if (pm10Grade >= 3) {
      advice += ' 미세먼지가 나쁘니 마스크를 착용하세요.';
    }

    return advice;
  }

  /**
   * 날씨 정보를 Telegram 메시지로 변환합니다.
   * @private
   * @param {WeatherData} weather - 통합 날씨 데이터
   * @returns {string[]} 생성된 메시지 배열
   */
  private getMessagesForTelegram(weather: WeatherData): string[] {
    const now = dayjs().format('YYYY-MM-DD HH:mm');
    const tempDiff = weather.forecast.maxTemp - weather.forecast.minTemp;

    let message = `🌤 서울 강남구 삼성동 날씨 (${now})\n\n`;

    // info: 현재 날씨
    message += `【현재 날씨】\n`;
    message += `• 기온: ${weather.current.temperature}℃\n`;
    message += `• 체감온도: ${weather.feelsLikeTemp}℃\n`;
    message += `• 하늘: ${weather.current.skyCondition}\n`;
    if (weather.current.precipitationType !== '없음') {
      message += `• 강수: ${weather.current.precipitationType}\n`;
    }
    message += `• 습도: ${weather.current.humidity}%\n`;
    message += `• 풍속: ${weather.current.windSpeed} m/s\n\n`;

    // info: 오늘 예보
    message += `【오늘 예보】\n`;
    message += `• 최저/최고: ${weather.forecast.minTemp}℃ / ${weather.forecast.maxTemp}℃\n`;
    message += `• 일교차: ${tempDiff}℃\n\n`;

    // info: 시간대별 예보
    message += `【시간대별 예보】\n`;
    message += `• 오전 (06-12시): ${weather.forecast.morningCondition}`;
    if (weather.forecast.morningPrecipType !== '없음') {
      message += ` (${weather.forecast.morningPrecipType})`;
    }
    message += ` | 강수확률 ${weather.forecast.morningPrecipProb}%\n`;

    message += `• 오후 (12-18시): ${weather.forecast.afternoonCondition}`;
    if (weather.forecast.afternoonPrecipType !== '없음') {
      message += ` (${weather.forecast.afternoonPrecipType})`;
    }
    message += ` | 강수확률 ${weather.forecast.afternoonPrecipProb}%\n`;

    message += `• 저녁 (18-24시): ${weather.forecast.eveningCondition}`;
    if (weather.forecast.eveningPrecipType !== '없음') {
      message += ` (${weather.forecast.eveningPrecipType})`;
    }
    message += ` | 강수확률 ${weather.forecast.eveningPrecipProb}%\n\n`;

    // info: 대기질
    message += `【대기질】\n`;
    message += `• 미세먼지(PM10): ${weather.airQuality.pm10Value}㎍/㎥ `;
    message += `(${weather.airQuality.pm10GradeText}) ${weather.airQuality.pm10GradeEmoji}\n`;
    message += `• 초미세먼지(PM2.5): ${weather.airQuality.pm25Value}㎍/㎥ `;
    message += `(${weather.airQuality.pm25GradeText}) ${weather.airQuality.pm25GradeEmoji}\n`;
    message += `• 통합대기질: ${weather.airQuality.khaiGradeText}\n\n`;

    // info: 옷차림 추천
    message += `【옷차림 추천】\n`;
    message += weather.clothingAdvice;

    return [message];
  }
}
