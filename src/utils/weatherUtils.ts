/**
 * 체감온도를 계산합니다.
 * @param {number} temp - 기온 (°C)
 * @param {number} windSpeed - 풍속 (m/s)
 * @param {number} humidity - 습도 (%)
 * @returns {number} 체감온도 (°C)
 */
export const calculateFeelsLikeTemp = (
  temp: number,
  windSpeed: number,
  humidity: number,
): number => {
  // info: 풍속을 km/h로 변환
  const windSpeedKmh = windSpeed * 3.6;

  // case: 기온 10도 이하일 때 체감온도 (Wind Chill)
  if (temp <= 10 && windSpeedKmh > 4.8) {
    const windChill =
      13.12 +
      0.6215 * temp -
      11.37 * Math.pow(windSpeedKmh, 0.16) +
      0.3965 * temp * Math.pow(windSpeedKmh, 0.16);
    return Math.round(windChill * 10) / 10;
  }

  // case: 기온 26도 이상일 때 불쾌지수 (Heat Index)
  // info: 기존 27도에서 26도로 하향하여 고습도 상황을 더 잘 반영
  if (temp >= 26) {
    const T = temp;
    const RH = humidity;
    const heatIndex =
      -8.78469475556 +
      1.61139411 * T +
      2.33854883889 * RH -
      0.14611605 * T * RH -
      0.012308094 * T * T -
      0.0164248277778 * RH * RH +
      0.002211732 * T * T * RH +
      0.00072546 * T * RH * RH -
      0.000003582 * T * T * RH * RH;
    return Math.round(heatIndex * 10) / 10;
  }

  // case: 11~25도 범위에서 습도와 바람에 따른 보정
  if (temp > 10 && temp < 26) {
    let adjustment = 0;

    // info: 습도 70% 초과 시 체감온도 상승 (최대 +3°C)
    if (humidity > 70) {
      adjustment += (humidity - 70) * 0.1;
    }

    // info: 풍속 10km/h 초과 시 체감온도 하락 (최대 -3°C)
    if (windSpeedKmh > 10) {
      adjustment -= Math.min((windSpeedKmh - 10) * 0.1, 3);
    }

    return Math.round((temp + adjustment) * 10) / 10;
  }

  // case: 일반적인 경우 (10도 이하이면서 풍속이 약한 경우)
  return temp;
};

/**
 * 하늘 상태 코드를 텍스트로 변환합니다.
 * @param {string} code - 하늘 상태 코드 (1:맑음, 3:구름많음, 4:흐림)
 * @returns {string} 하늘 상태 텍스트
 */
export const getSkyConditionText = (code: string): string => {
  const skyMap: Record<string, string> = {
    '1': '맑음 ☀️',
    '3': '구름많음 ⛅',
    '4': '흐림 ☁️',
  };
  return skyMap[code] || '알 수 없음';
};

/**
 * 강수 형태 코드를 텍스트로 변환합니다.
 * @param {string} code - 강수 형태 코드 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기)
 * @returns {string} 강수 형태 텍스트
 */
export const getPrecipitationTypeText = (code: string): string => {
  const precipMap: Record<string, string> = {
    '0': '없음',
    '1': '비 🌧️',
    '2': '비/눈 🌨️',
    '3': '눈 ❄️',
    '4': '소나기 🌦️',
  };
  return precipMap[code] || '알 수 없음';
};

/**
 * 대기질 등급을 텍스트로 변환합니다.
 * @param {number} grade - 대기질 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)
 * @returns {string} 대기질 등급 텍스트
 */
export const getAirQualityGradeText = (grade: number): string => {
  const gradeMap: Record<number, string> = {
    1: '좋음',
    2: '보통',
    3: '나쁨',
    4: '매우나쁨',
  };
  return gradeMap[grade] || '알 수 없음';
};

/**
 * 대기질 등급에 해당하는 이모지를 반환합니다.
 * @param {number} grade - 대기질 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)
 * @returns {string} 대기질 등급 이모지
 */
export const getAirQualityGradeEmoji = (grade: number): string => {
  const emojiMap: Record<number, string> = {
    1: '🟢',
    2: '🟡',
    3: '🟠',
    4: '🔴',
  };
  return emojiMap[grade] || '';
};

/**
 * 기상청 격자 좌표 정의
 */
export const LOCATIONS = {
  SAMSUNG_DONG: { nx: 61, ny: 126, station: '삼성동' },
} as const;
