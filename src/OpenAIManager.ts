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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 전문적인 뉴스 요약 전문가입니다. 다음 가이드라인을 따라 기사를 요약해주세요:

1. 핵심 내용: 누가, 언제, 어디서, 무엇을, 왜, 어떻게의 요소 중 중요한 것들을 포함
2. 길이: 2-3문장으로 간결하게 요약
3. 객관성: 개인적인 의견이나 추측 없이 사실만 전달
4. 완성도: 요약만 읽어도 기사의 핵심을 이해할 수 있도록 작성
5. 언어: 자연스럽고 명확한 한국어 사용

중요한 수치, 날짜, 인명 등은 정확히 포함하고, 불필요한 세부사항은 제외해주세요.`,
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
