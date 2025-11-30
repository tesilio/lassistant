/**
 * 날씨 API만 테스트하는 스크립트 (Telegram, OpenAI 제외)
 */
import WeatherAPIManager from './src/WeatherAPIManager';
import AirKoreaManager from './src/AirKoreaManager';
import { calculateFeelsLikeTemp } from './src/utils/weatherUtils';

// info: 환경변수 직접 설정
process.env.DATA_GO_API_KEY = '5f25272a832e49b586de394364ad27c6b002ad75165745759f5feebd0d8f6dcc';
process.env.DATA_GO_API_KEY = '5f25272a832e49b586de394364ad27c6b002ad75165745759f5feebd0d8f6dcc';
process.env.WEATHER_NX = '61';
process.env.WEATHER_NY = '126';
process.env.WEATHER_STATION = '삼성동';

const test = async () => {
  console.log('🌤 날씨 API 테스트 시작...\n');

  try {
    const weatherManager = WeatherAPIManager.getInstance();
    const airKoreaManager = AirKoreaManager.getInstance();

    console.log('📡 기상청 API 호출 중...');
    const [current, forecast] = await Promise.all([
      weatherManager.getUltraShortTermForecast(61, 126),
      weatherManager.getShortTermForecast(61, 126),
    ]);

    console.log('\n【현재 날씨】');
    console.log(`기온: ${current.temperature}℃`);
    console.log(`습도: ${current.humidity}%`);
    console.log(`풍속: ${current.windSpeed} m/s`);
    console.log(`하늘: ${current.skyCondition}`);
    console.log(`강수형태: ${current.precipitationType}`);

    const feelsLikeTemp = calculateFeelsLikeTemp(
      current.temperature,
      current.windSpeed,
      current.humidity
    );
    console.log(`체감온도: ${feelsLikeTemp}℃`);

    console.log('\n【오늘 예보】');
    console.log(`최저/최고: ${forecast.minTemp}℃ / ${forecast.maxTemp}℃`);
    console.log(`오전 강수확률: ${forecast.morningPrecipProb}%`);
    console.log(`오후 강수확률: ${forecast.afternoonPrecipProb}%`);
    console.log(`저녁 강수확률: ${forecast.eveningPrecipProb}%`);
    console.log(`오전: ${forecast.morningCondition}`);
    console.log(`오후: ${forecast.afternoonCondition}`);
    console.log(`저녁: ${forecast.eveningCondition}`);

    console.log('\n📡 에어코리아 API 호출 중...');
    const airQuality = await airKoreaManager.getAirQuality('삼성동');

    console.log('\n【대기질】');
    console.log(
      `미세먼지(PM10): ${airQuality.pm10Value}㎍/㎥ (${airQuality.pm10GradeText}) ${airQuality.pm10GradeEmoji}`
    );
    console.log(
      `초미세먼지(PM2.5): ${airQuality.pm25Value}㎍/㎥ (${airQuality.pm25GradeText}) ${airQuality.pm25GradeEmoji}`
    );
    console.log(`통합대기질: ${airQuality.khaiGradeText}`);

    console.log('\n✅ 모든 API 테스트 성공!');
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
  }
};

test();
