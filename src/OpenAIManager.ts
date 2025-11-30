import OpenAI from 'openai';
import environment from '../config/environment';

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
      console.error('OpenAI API 요약 실패:', error);
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
    morningPrecipProb: number;
    afternoonPrecipProb: number;
    eveningPrecipProb: number;
    skyCondition: string;
    pm10Grade: number;
  }): Promise<string> {
    try {
      const systemPrompt = `당신은 날씨 정보를 바탕으로 실용적인 옷차림을 추천하는 전문가입니다.

# 입력 정보
- 현재 기온 및 체감온도
- 오늘 최저/최고 기온
- 강수 확률 및 날씨 상태
- 미세먼지 등급

# 추천 규칙
1. **체감온도 기반**: 실제 기온보다 체감온도를 우선 고려
2. **일교차 고려**: 최저-최고 기온 차이가 8도 이상이면 겉옷 추천
3. **날씨 상태**: 비/눈 예보 시 우산/방수 옷 언급
4. **대기질**: 미세먼지 나쁨 이상일 때 마스크 착용 권장
5. **자연스러운 문장**: 2-4문장의 친근한 톤

# 출력 형식
추천 내용만 출력하고, 다른 설명은 포함하지 마세요.`;

      const pm10GradeText =
        weatherData.pm10Grade === 1
          ? '좋음'
          : weatherData.pm10Grade === 2
            ? '보통'
            : weatherData.pm10Grade === 3
              ? '나쁨'
              : '매우나쁨';

      const userPrompt = `
현재 기온: ${weatherData.currentTemp}°C
체감온도: ${weatherData.feelsLikeTemp}°C
최저/최고: ${weatherData.minTemp}°C / ${weatherData.maxTemp}°C
오전 강수확률: ${weatherData.morningPrecipProb}%
오후 강수확률: ${weatherData.afternoonPrecipProb}%
저녁 강수확률: ${weatherData.eveningPrecipProb}%
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
      console.error('OpenAI API 옷차림 추천 실패:', error);
      throw error;
    }
  }
}
