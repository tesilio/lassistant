import OpenAI from 'openai';
import environment from '../config/environment';
import { logger } from './infrastructure/logger';

/**
 * OpenAI API 관리자 클래스
 */
export default class OpenAIManager {
  private static instance: OpenAIManager;
  private openai: OpenAI;

  /**
   * 생성자
   * @private
   */
  private constructor() {
    this.openai = new OpenAI({
      apiKey: environment.openai.apiKey,
    });
  }

  /**
   * 싱글톤 인스턴스 반환
   * @returns {OpenAIManager}
   */
  public static getInstance(): OpenAIManager {
    if (!OpenAIManager.instance) {
      OpenAIManager.instance = new OpenAIManager();
    }
    return OpenAIManager.instance;
  }

  /**
   * 싱글톤 인스턴스 리셋 (테스트 전용)
   * @internal
   */
  public static resetInstance(): void {
    OpenAIManager.instance = undefined as unknown as OpenAIManager;
  }

  /**
   * 텍스트를 요약합니다.
   * @param {string} text - 요약할 텍스트
   * @returns {Promise<string>} 요약된 텍스트
   */
  public async summarizeText(text: string): Promise<string> {
    try {
      // 텍스트가 너무 짧으면 요약하지 않음
      if (text.length < 200) {
        return text;
      }

      const currentDate = new Date().toISOString().split('T')[0];

      const systemPrompt = `당신은 전문적인 뉴스 요약 전문가입니다.

# 현재 날짜
${currentDate}

# 요약 규칙
1. **길이**: 정확히 2-3문장으로 작성
2. **핵심 요소**: 5W1H(누가, 언제, 어디서, 무엇을, 왜, 어떻게) 중 중요한 것만 포함
3. **객관성**: 사실만 전달하고 의견이나 추측 배제
4. **정확성**: 수치, 날짜, 인명 등을 정확히 포함
5. **자연스러운 한국어**: 명확하고 간결한 문장 사용
6. **시간 표현**: 기사의 날짜를 현재 날짜(${currentDate})와 비교하여 적절한 시제 사용
   - 오늘: "~했다", "~한다"
   - 어제: "어제 ~했다"
   - 이번 주: "지난 X요일 ~했다"
   - 그 이상: "X월 X일 ~했다"

# 출력 형식
요약문만 출력하고, 다른 설명이나 부가 정보는 포함하지 마세요.

# 예시
입력: "2025년 11월 15일, 서울시는 내년부터 전기차 충전소를 현재의 2배인 5000개로 확대한다고 발표했다. 시는 주거지역과 공공시설 중심으로 충전 인프라를 구축할 계획이며, 이를 위해 500억 원의 예산을 투입한다. 환경부와 협력하여 충전기 설치 지원금도 확대할 예정이다."

출력: "서울시가 어제 전기차 충전소를 2026년까지 5000개로 확대한다고 발표했다. 주거지역과 공공시설 중심으로 500억 원을 투입하여 인프라를 구축하며, 환경부와 협력해 설치 지원금도 확대할 계획이다."`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `다음 기사를 요약해주세요:\n\n${text}`,
          },
        ],
        temperature: 0.2,
        max_completion_tokens: 200,
      });

      return response.choices[0].message.content?.trim() || '요약 실패';
    } catch (error) {
      logger.error('OpenAI API 요약 실패', error);
      throw error;
    }
  }

  /**
   * 날씨 정보 기반 옷차림 추천 생성
   * @async
   * @param {object} weatherData - 날씨 정보
   * @param {number} weatherData.currentTemp - 현재 기온
   * @param {number} weatherData.feelsLikeTemp - 체감온도
   * @param {number} weatherData.minTemp - 최저기온
   * @param {number} weatherData.maxTemp - 최고기온
   * @param {number} weatherData.humidity - 습도
   * @param {number} weatherData.morningPrecipProb - 오전 강수확률
   * @param {number} weatherData.afternoonPrecipProb - 오후 강수확률
   * @param {number} weatherData.eveningPrecipProb - 저녁 강수확률
   * @param {string} weatherData.skyCondition - 하늘 상태
   * @param {number} weatherData.pm10Grade - 미세먼지 등급
   * @returns {Promise<string>} 옷차림 추천 텍스트
   */
  public async generateClothingAdvice(weatherData: {
    currentTemp: number;
    feelsLikeTemp: number;
    minTemp: number;
    maxTemp: number;
    humidity?: number;
    morningPrecipProb: number;
    afternoonPrecipProb: number;
    eveningPrecipProb: number;
    skyCondition: string;
    pm10Grade: number;
  }): Promise<string> {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const month = new Date().getMonth() + 1;
      const season = this.getSeason(month);

      const systemPrompt = `당신은 날씨 정보를 바탕으로 실용적인 옷차림을 추천하는 전문가입니다.

# 현재 날짜
${currentDate} (${season})

# 체감온도별 옷차림 기준
- 4°C 이하: 패딩, 두꺼운 코트, 목도리, 장갑, 히트텍
- 5~8°C: 울코트, 가죽자켓, 니트, 기모제품
- 9~11°C: 트렌치코트, 야상, 재킷, 니트
- 12~16°C: 자켓, 가디건, 맨투맨, 청바지
- 17~19°C: 얇은 가디건, 긴팔 티셔츠, 면바지
- 20~22°C: 긴팔 티셔츠, 블라우스, 슬랙스
- 23~27°C: 반팔, 얇은 셔츠, 면바지, 린넨
- 28°C 이상: 민소매, 반팔, 반바지, 원피스

# 추가 고려사항
1. **체감온도 우선**: 실제 기온보다 체감온도 기준으로 추천
2. **일교차 8°C 이상**: 겉옷(가디건, 얇은 재킷) 필수 권장
3. **강수확률 40% 이상**: 우산 또는 방수 겉옷 언급
4. **미세먼지 나쁨 이상**: 마스크 착용 권장
5. **습도 80% 이상**: 통기성 좋은 소재 권장, 눅눅함 주의
6. **습도 30% 이하**: 보습 케어 언급 (겨울철)
7. **맑은 날 + 기온 20°C 이상**: 자외선 차단 언급

# 출력 형식
- 2~4문장의 친근하고 실용적인 톤
- 구체적인 아이템명 포함 (예: "얇은 가디건", "면바지")
- 특이사항(비, 미세먼지, 일교차)이 있으면 반드시 언급
- 추천 내용만 출력하고, 다른 설명은 포함하지 마세요.`;

      const pm10GradeText =
        weatherData.pm10Grade === 1
          ? '좋음'
          : weatherData.pm10Grade === 2
            ? '보통'
            : weatherData.pm10Grade === 3
              ? '나쁨'
              : '매우나쁨';

      const tempDiff = weatherData.maxTemp - weatherData.minTemp;
      const maxPrecipProb = Math.max(
        weatherData.morningPrecipProb,
        weatherData.afternoonPrecipProb,
        weatherData.eveningPrecipProb,
      );

      const userPrompt = `현재 기온: ${weatherData.currentTemp}°C
체감온도: ${weatherData.feelsLikeTemp}°C
최저/최고: ${weatherData.minTemp}°C / ${weatherData.maxTemp}°C (일교차 ${tempDiff}°C)
습도: ${weatherData.humidity ?? '정보 없음'}%
최대 강수확률: ${maxPrecipProb}% (오전 ${weatherData.morningPrecipProb}%, 오후 ${weatherData.afternoonPrecipProb}%, 저녁 ${weatherData.eveningPrecipProb}%)
하늘: ${weatherData.skyCondition}
미세먼지: ${pm10GradeText}

위 날씨 정보를 바탕으로 옷차림을 추천해주세요.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_completion_tokens: 200,
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      logger.error('OpenAI API 옷차림 추천 실패', error);
      throw error;
    }
  }

  private getSeason(month: number): string {
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
  }
}
