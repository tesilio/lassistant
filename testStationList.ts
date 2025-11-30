/**
 * 에어코리아 측정소 목록 조회 스크립트
 */
import AirKoreaManager from './src/AirKoreaManager';

// info: 환경변수 직접 설정
process.env.DATA_GO_API_KEY = '5f25272a832e49b586de394364ad27c6b002ad75165745759f5feebd0d8f6dcc';

const test = async () => {
  console.log('📡 에어코리아 측정소 목록 조회 시작...\n');

  try {
    const airKoreaManager = AirKoreaManager.getInstance();

    console.log('📍 강남구 측정소 목록 조회 중...');
    const stations = await airKoreaManager.getStationList('강남구');

    console.log(`\n✅ 총 ${stations.length}개의 측정소 발견:\n`);

    stations.forEach((station, index) => {
      console.log(`${index + 1}. ${station.stationName}`);
      console.log(`   주소: ${station.addr}\n`);
    });

    console.log('💡 삼성동 근처 측정소를 찾아보세요!');
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
  }
};

test();
