import environment from '../config/environment';
import { getAirQualityGradeText, getAirQualityGradeEmoji } from './utils/weatherUtils';
import { BaseAPIManager } from './services/base/BaseAPIManager';
import {
  AirQualityInfo,
  AirKoreaResponse,
  StationListItem,
  StationListResponse,
} from './types/weather';

export { AirQualityInfo };

export default class AirKoreaManager extends BaseAPIManager {
  private static instance: AirKoreaManager;
  private readonly baseUrl =
    'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
  private readonly stationListUrl =
    'http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getMsrstnList';
  private readonly apiKey: string;
  protected readonly serviceName = '에어코리아';

  private constructor() {
    super();
    this.apiKey = environment.weather.dataGoApiKey;
  }

  public static getInstance(): AirKoreaManager {
    if (!AirKoreaManager.instance) {
      AirKoreaManager.instance = new AirKoreaManager();
    }
    return AirKoreaManager.instance;
  }

  public static resetInstance(): void {
    AirKoreaManager.instance = undefined as unknown as AirKoreaManager;
  }

  public async getStationList(addr: string): Promise<StationListItem[]> {
    const params = {
      serviceKey: this.apiKey,
      returnType: 'json',
      numOfRows: 100,
      pageNo: 1,
      addr,
    };

    const response = await this.retryRequest<StationListResponse>(async () => {
      return this.http.get(this.stationListUrl, { params });
    }, 3);

    return response.data.response.body.items || [];
  }

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

    const response = await this.retryRequest<AirKoreaResponse>(async () => {
      return this.http.get(this.baseUrl, { params });
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

  private parseGrade(gradeStr: string): number {
    const grade = parseInt(gradeStr, 10);
    return isNaN(grade) ? 1 : grade;
  }
}
