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
}
