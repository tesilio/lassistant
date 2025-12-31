import {
  calculateFeelsLikeTemp,
  getSkyConditionText,
  getPrecipitationTypeText,
  getAirQualityGradeText,
  getAirQualityGradeEmoji,
  LOCATIONS,
} from '../utils/weatherUtils';

describe('weatherUtils', () => {
  describe('calculateFeelsLikeTemp', () => {
    describe('Wind Chill (기온 10도 이하, 풍속 4.8km/h 초과)', () => {
      it('영하 5도, 풍속 5m/s일 때 체감온도가 크게 낮아져야 합니다', () => {
        const result = calculateFeelsLikeTemp(-5, 5, 50);
        expect(result).toBeLessThan(-5);
        expect(result).toBeCloseTo(-11.2, 0);
      });

      it('기온 0도, 풍속 2m/s일 때 체감온도가 낮아져야 합니다', () => {
        const result = calculateFeelsLikeTemp(0, 2, 50);
        expect(result).toBeLessThan(0);
      });

      it('기온 10도, 풍속 10m/s일 때 체감온도가 낮아져야 합니다', () => {
        const result = calculateFeelsLikeTemp(10, 10, 50);
        expect(result).toBeLessThan(10);
      });
    });

    describe('Heat Index (기온 26도 이상)', () => {
      it('기온 35도, 습도 80%일 때 체감온도가 높아져야 합니다', () => {
        const result = calculateFeelsLikeTemp(35, 1, 80);
        expect(result).toBeGreaterThan(35);
      });

      it('기온 30도, 습도 30%일 때 체감온도가 실제 기온과 비슷해야 합니다', () => {
        const result = calculateFeelsLikeTemp(30, 1, 30);
        expect(result).toBeGreaterThanOrEqual(26);
      });

      it('기온 27도, 습도 90%일 때 체감온도가 높아져야 합니다', () => {
        const result = calculateFeelsLikeTemp(27, 1, 90);
        expect(result).toBeGreaterThan(27);
      });

      it('기온 26도, 습도 85%일 때 체감온도가 높아져야 합니다 (임계값 하향)', () => {
        const result = calculateFeelsLikeTemp(26, 1, 85);
        expect(result).toBeGreaterThan(26);
      });
    });

    describe('중간 온도 범위 (11~25도) 습도/바람 보정', () => {
      it('기온 20도, 습도 50%, 풍속 2m/s일 때 보정 없이 기온 반환', () => {
        const result = calculateFeelsLikeTemp(20, 2, 50);
        expect(result).toBe(20);
      });

      it('기온 20도, 습도 80%일 때 체감온도가 상승해야 합니다', () => {
        const result = calculateFeelsLikeTemp(20, 1, 80);
        expect(result).toBeGreaterThan(20);
        expect(result).toBeCloseTo(21, 0);
      });

      it('기온 20도, 풍속 5m/s(18km/h)일 때 체감온도가 하락해야 합니다', () => {
        const result = calculateFeelsLikeTemp(20, 5, 50);
        expect(result).toBeLessThan(20);
      });

      it('기온 15도, 습도 90%, 풍속 1m/s일 때 습도 보정으로 체감온도 상승', () => {
        const result = calculateFeelsLikeTemp(15, 1, 90);
        expect(result).toBeGreaterThan(15);
        expect(result).toBeCloseTo(17, 0);
      });

      it('기온 22도, 습도 50%, 풍속 10m/s(36km/h)일 때 바람 보정으로 체감온도 하락', () => {
        const result = calculateFeelsLikeTemp(22, 10, 50);
        expect(result).toBeLessThan(22);
      });

      it('습도와 바람 보정이 동시에 적용되어야 합니다', () => {
        const result = calculateFeelsLikeTemp(18, 4, 80);
        expect(result).not.toBe(18);
      });
    });

    describe('경계값 테스트', () => {
      it('기온 10도, 풍속 1m/s(3.6km/h)일 때 기온을 그대로 반환해야 합니다', () => {
        const result = calculateFeelsLikeTemp(10, 1, 50);
        expect(result).toBe(10);
      });

      it('기온 11도, 습도 50%, 풍속 2m/s일 때 보정 없이 기온 반환', () => {
        const result = calculateFeelsLikeTemp(11, 2, 50);
        expect(result).toBe(11);
      });

      it('기온 25도, 습도 50%, 풍속 2m/s일 때 보정 없이 기온 반환', () => {
        const result = calculateFeelsLikeTemp(25, 2, 50);
        expect(result).toBe(25);
      });

      it('기온 26도일 때 Heat Index가 적용되어야 합니다', () => {
        const result = calculateFeelsLikeTemp(26, 1, 80);
        expect(result).toBeGreaterThan(26);
      });
    });
  });

  describe('getSkyConditionText', () => {
    it('코드 1은 "맑음"을 반환해야 합니다', () => {
      expect(getSkyConditionText('1')).toBe('맑음 ☀️');
    });

    it('코드 3은 "구름많음"을 반환해야 합니다', () => {
      expect(getSkyConditionText('3')).toBe('구름많음 ⛅');
    });

    it('코드 4는 "흐림"을 반환해야 합니다', () => {
      expect(getSkyConditionText('4')).toBe('흐림 ☁️');
    });

    it('알 수 없는 코드는 "알 수 없음"을 반환해야 합니다', () => {
      expect(getSkyConditionText('99')).toBe('알 수 없음');
      expect(getSkyConditionText('')).toBe('알 수 없음');
      expect(getSkyConditionText('invalid')).toBe('알 수 없음');
    });
  });

  describe('getPrecipitationTypeText', () => {
    it('코드 0은 "없음"을 반환해야 합니다', () => {
      expect(getPrecipitationTypeText('0')).toBe('없음');
    });

    it('코드 1은 "비"를 반환해야 합니다', () => {
      expect(getPrecipitationTypeText('1')).toBe('비 🌧️');
    });

    it('코드 2는 "비/눈"을 반환해야 합니다', () => {
      expect(getPrecipitationTypeText('2')).toBe('비/눈 🌨️');
    });

    it('코드 3은 "눈"을 반환해야 합니다', () => {
      expect(getPrecipitationTypeText('3')).toBe('눈 ❄️');
    });

    it('코드 4는 "소나기"를 반환해야 합니다', () => {
      expect(getPrecipitationTypeText('4')).toBe('소나기 🌦️');
    });

    it('알 수 없는 코드는 "알 수 없음"을 반환해야 합니다', () => {
      expect(getPrecipitationTypeText('99')).toBe('알 수 없음');
      expect(getPrecipitationTypeText('')).toBe('알 수 없음');
    });
  });

  describe('getAirQualityGradeText', () => {
    it('등급 1은 "좋음"을 반환해야 합니다', () => {
      expect(getAirQualityGradeText(1)).toBe('좋음');
    });

    it('등급 2는 "보통"을 반환해야 합니다', () => {
      expect(getAirQualityGradeText(2)).toBe('보통');
    });

    it('등급 3은 "나쁨"을 반환해야 합니다', () => {
      expect(getAirQualityGradeText(3)).toBe('나쁨');
    });

    it('등급 4는 "매우나쁨"을 반환해야 합니다', () => {
      expect(getAirQualityGradeText(4)).toBe('매우나쁨');
    });

    it('알 수 없는 등급은 "알 수 없음"을 반환해야 합니다', () => {
      expect(getAirQualityGradeText(0)).toBe('알 수 없음');
      expect(getAirQualityGradeText(5)).toBe('알 수 없음');
      expect(getAirQualityGradeText(-1)).toBe('알 수 없음');
    });
  });

  describe('getAirQualityGradeEmoji', () => {
    it('등급 1은 녹색 원을 반환해야 합니다', () => {
      expect(getAirQualityGradeEmoji(1)).toBe('🟢');
    });

    it('등급 2는 노란색 원을 반환해야 합니다', () => {
      expect(getAirQualityGradeEmoji(2)).toBe('🟡');
    });

    it('등급 3은 주황색 원을 반환해야 합니다', () => {
      expect(getAirQualityGradeEmoji(3)).toBe('🟠');
    });

    it('등급 4는 빨간색 원을 반환해야 합니다', () => {
      expect(getAirQualityGradeEmoji(4)).toBe('🔴');
    });

    it('알 수 없는 등급은 빈 문자열을 반환해야 합니다', () => {
      expect(getAirQualityGradeEmoji(0)).toBe('');
      expect(getAirQualityGradeEmoji(5)).toBe('');
    });
  });

  describe('LOCATIONS', () => {
    it('삼성동 좌표가 올바르게 정의되어 있어야 합니다', () => {
      expect(LOCATIONS.SAMSUNG_DONG).toEqual({
        nx: 61,
        ny: 126,
        station: '삼성동',
      });
    });
  });
});
