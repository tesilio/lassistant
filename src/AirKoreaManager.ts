import { default as axios, AxiosResponse } from 'axios';
import environment from '../config/environment';
import { getAirQualityGradeText, getAirQualityGradeEmoji } from './utils/weatherUtils';

/**
 * 대기질 정보 인터페이스
 */
export interface AirQualityInfo {
  pm10Value: number; // 미세먼지 농도 (㎍/㎥)
  pm10Grade: number; // 미세먼지 등급 (1-4)
  pm25Value: number; // 초미세먼지 농도 (㎍/㎥)
  pm25Grade: number; // 초미세먼지 등급 (1-4)
  khaiValue: number; // 통합대기환경지수
  khaiGrade: number; // 통합대기환경지수 등급 (1-4)
  pm10GradeText: string; // 미세먼지 등급 텍스트
  pm25GradeText: string; // 초미세먼지 등급 텍스트
  khaiGradeText: string; // 통합대기환경지수 등급 텍스트
  pm10GradeEmoji: string; // 미세먼지 등급 이모지
  pm25GradeEmoji: string; // 초미세먼지 등급 이모지
  khaiGradeEmoji: string; // 통합대기환경지수 등급 이모지
}

/**
 * 에어코리아 API 응답 아이템 인터페이스
 */
interface AirKoreaResponseItem {
  stationName: string;
  dataTime: string;
  so2Value: string;
  coValue: string;
  o3Value: string;
  no2Value: string;
  pm10Value: string;
  pm10Grade: string;
  pm25Value: string;
  pm25Grade: string;
  khaiValue: string;
  khaiGrade: string;
}

/**
 * 에어코리아 API 응답 인터페이스
 */
interface AirKoreaResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: AirKoreaResponseItem[];
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

/**
 * 측정소 목록 응답 인터페이스
 */
interface StationListItem {
  stationName: string;
  addr: string;
}

/**
 * 측정소 목록 API 응답 인터페이스
 */
interface StationListResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: StationListItem[];
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

/**
 * 에어코리아 API 관리자 클래스 (싱글톤)
 */
export default class AirKoreaManager {
  private static instance: AirKoreaManager;
  private readonly baseUrl =
    'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
  private readonly stationListUrl =
    'http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getMsrstnList';
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
   * @returns {AirKoreaManager}
   */
  public static getInstance(): AirKoreaManager {
    if (!AirKoreaManager.instance) {
      AirKoreaManager.instance = new AirKoreaManager();
    }
    return AirKoreaManager.instance;
  }

  /**
   * 싱글톤 인스턴스 리셋 (테스트 전용)
   * @internal
   */
  public static resetInstance(): void {
    AirKoreaManager.instance = undefined as unknown as AirKoreaManager;
  }

  /**
   * 특정 지역의 측정소 목록 조회
   * @async
   * @param {string} addr - 지역명 (예: '강남구')
   * @returns {Promise<StationListItem[]>} 측정소 목록
   */
  public async getStationList(addr: string): Promise<StationListItem[]> {
    const params = {
      serviceKey: this.apiKey,
      returnType: 'json',
      numOfRows: 100,
      pageNo: 1,
      addr,
    };

    const response = await this.retryRequest<AxiosResponse<StationListResponse>>(async () => {
      return axios.get(this.stationListUrl, { params });
    }, 3);

    return response.data.response.body.items || [];
  }

  /**
   * 측정소별 실시간 대기질 조회
   * @async
   * @param {string} stationName - 측정소 이름
   * @returns {Promise<AirQualityInfo>} 대기질 정보
   */
  public async getAirQuality(stationName: string): Promise<AirQualityInfo> {
    const params = {
      serviceKey: this.apiKey,
      returnType: 'json',
      numOfRows: 1,
      pageNo: 1,
      stationName,
      dataTerm: 'DAILY',
      ver: '1.0',
    };

    const response = await this.retryRequest<AxiosResponse<AirKoreaResponse>>(async () => {
      return axios.get(this.baseUrl, { params });
    }, 3);

    const items = response.data.response.body.items;

    // case: 데이터가 없는 경우
    if (items.length === 0) {
      throw new Error(`측정소 ${stationName}의 대기질 정보를 찾을 수 없습니다.`);
    }

    const item = items[0];

    const pm10Grade = this.parseGrade(item.pm10Grade);
    const pm25Grade = this.parseGrade(item.pm25Grade);
    const khaiGrade = this.parseGrade(item.khaiGrade);

    return {
      pm10Value: parseFloat(item.pm10Value) || 0,
      pm10Grade,
      pm25Value: parseFloat(item.pm25Value) || 0,
      pm25Grade,
      khaiValue: parseFloat(item.khaiValue) || 0,
      khaiGrade,
      pm10GradeText: getAirQualityGradeText(pm10Grade),
      pm25GradeText: getAirQualityGradeText(pm25Grade),
      khaiGradeText: getAirQualityGradeText(khaiGrade),
      pm10GradeEmoji: getAirQualityGradeEmoji(pm10Grade),
      pm25GradeEmoji: getAirQualityGradeEmoji(pm25Grade),
      khaiGradeEmoji: getAirQualityGradeEmoji(khaiGrade),
    };
  }

  /**
   * 등급 문자열을 숫자로 변환
   * @private
   * @param {string} gradeStr - 등급 문자열
   * @returns {number} 등급 숫자 (1-4)
   */
  private parseGrade(gradeStr: string): number {
    const grade = parseInt(gradeStr, 10);
    return isNaN(grade) ? 1 : grade;
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
  private async retryRequest<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
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
