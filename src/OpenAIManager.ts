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
            content:
              '당신은 IT/과학 기사를 요약하는 도우미입니다. 주어진 기사를 2-3문장으로 간결하게 요약해주세요.',
          },
          {
            role: 'user',
            content: `다음 기사를 요약해주세요:\n\n${text}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      return response.choices[0].message.content?.trim() || '요약 실패';
    } catch (error) {
      console.error('OpenAI API 요약 실패:', error);
      throw error;
    }
  }
}
