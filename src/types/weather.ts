export interface UltraShortWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationType: string;
  skyCondition: string;
}

export interface ShortTermWeather {
  minTemp: number;
  maxTemp: number;
  morningPrecipProb: number;
  afternoonPrecipProb: number;
  eveningPrecipProb: number;
  morningCondition: string;
  afternoonCondition: string;
  eveningCondition: string;
  morningPrecipType: string;
  afternoonPrecipType: string;
  eveningPrecipType: string;
}

export interface AirQualityInfo {
  pm10Value: number;
  pm10Grade: number;
  pm25Value: number;
  pm25Grade: number;
  khaiValue: number;
  khaiGrade: number;
  pm10GradeText: string;
  pm25GradeText: string;
  khaiGradeText: string;
  pm10GradeEmoji: string;
  pm25GradeEmoji: string;
  khaiGradeEmoji: string;
}

export interface WeatherData {
  current: UltraShortWeather;
  forecast: ShortTermWeather;
  airQuality: AirQualityInfo;
  feelsLikeTemp: number;
  clothingAdvice: string;
}

export interface KMAResponseItem {
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

export interface KMAResponse {
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

export interface AirKoreaResponseItem {
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

export interface AirKoreaResponse {
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

export interface StationListItem {
  stationName: string;
  addr: string;
}

export interface StationListResponse {
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
