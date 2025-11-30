/**
 * 로컬 날씨 핸들러 테스트 스크립트
 */
import { handler } from './src/handlers/dailyWeather';

const test = async () => {
  console.log('날씨 핸들러 테스트 시작...\n');

  try {
    const result = await handler();
    console.log('\n✅ 성공!');
    console.log('상태 코드:', result.statusCode);
  } catch (error) {
    console.error('\n❌ 실패:', error);
  }
};

test();
