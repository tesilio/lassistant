jest.mock('openai');

import OpenAI from 'openai';
import OpenAIManager from '../OpenAIManager';

describe('OpenAIManager', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    OpenAIManager.resetInstance();

    mockCreate = jest.fn();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        }) as unknown as OpenAI,
    );
  });

  describe('getInstance', () => {
    it('싱글톤 인스턴스를 반환해야 한다', () => {
      const instance1 = OpenAIManager.getInstance();
      const instance2 = OpenAIManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('resetInstance 후 새로운 인스턴스를 생성해야 한다', () => {
      const instance1 = OpenAIManager.getInstance();
      OpenAIManager.resetInstance();
      const instance2 = OpenAIManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('summarizeText', () => {
    it('200자 미만 텍스트는 그대로 반환해야 한다', async () => {
      const shortText = '짧은 텍스트입니다.';

      const manager = OpenAIManager.getInstance();
      const result = await manager.summarizeText(shortText);

      expect(result).toBe(shortText);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('200자 이상 텍스트는 OpenAI API를 호출해야 한다', async () => {
      const longText = 'A'.repeat(250);
      const expectedSummary = '요약된 텍스트입니다.';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: expectedSummary,
            },
          },
        ],
      });

      const manager = OpenAIManager.getInstance();
      const result = await manager.summarizeText(longText);

      expect(result).toBe(expectedSummary);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_completion_tokens: 200,
        }),
      );
    });

    it('API 응답이 비어있으면 "요약 실패"를 반환해야 한다', async () => {
      const longText = 'A'.repeat(250);

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const manager = OpenAIManager.getInstance();
      const result = await manager.summarizeText(longText);

      expect(result).toBe('요약 실패');
    });

    it('API 호출 실패 시 에러를 던져야 한다', async () => {
      const longText = 'A'.repeat(250);

      mockCreate.mockRejectedValueOnce(new Error('API 오류'));

      const manager = OpenAIManager.getInstance();

      await expect(manager.summarizeText(longText)).rejects.toThrow('API 오류');
    });

    it('시스템 프롬프트에 현재 날짜가 포함되어야 한다', async () => {
      const longText = 'A'.repeat(250);

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '요약' } }],
      });

      const manager = OpenAIManager.getInstance();
      await manager.summarizeText(longText);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((m: { role: string }) => m.role === 'system');

      const today = new Date().toISOString().split('T')[0];
      expect(systemMessage.content).toContain(today);
    });
  });

  describe('generateClothingAdvice', () => {
    const mockWeatherData = {
      currentTemp: 10,
      feelsLikeTemp: 8,
      minTemp: 5,
      maxTemp: 15,
      humidity: 60,
      morningPrecipProb: 10,
      afternoonPrecipProb: 20,
      eveningPrecipProb: 30,
      skyCondition: '맑음',
      pm10Grade: 2,
    };

    it('옷차림 추천을 반환해야 한다', async () => {
      const expectedAdvice = '오늘은 가벼운 자켓을 입으세요.';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: expectedAdvice,
            },
          },
        ],
      });

      const manager = OpenAIManager.getInstance();
      const result = await manager.generateClothingAdvice(mockWeatherData);

      expect(result).toBe(expectedAdvice);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_completion_tokens: 200,
        }),
      );
    });

    it('API 응답이 비어있으면 빈 문자열을 반환해야 한다', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const manager = OpenAIManager.getInstance();
      const result = await manager.generateClothingAdvice(mockWeatherData);

      expect(result).toBe('');
    });

    it('API 호출 실패 시 에러를 던져야 한다', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API 오류'));

      const manager = OpenAIManager.getInstance();

      await expect(manager.generateClothingAdvice(mockWeatherData)).rejects.toThrow('API 오류');
    });

    it('미세먼지 등급에 따라 올바른 텍스트가 포함되어야 한다', async () => {
      const gradeTestCases = [
        { grade: 1, expectedText: '좋음' },
        { grade: 2, expectedText: '보통' },
        { grade: 3, expectedText: '나쁨' },
        { grade: 4, expectedText: '매우나쁨' },
      ];

      for (const testCase of gradeTestCases) {
        mockCreate.mockReset();
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: '추천' } }],
        });

        const manager = OpenAIManager.getInstance();
        await manager.generateClothingAdvice({
          ...mockWeatherData,
          pm10Grade: testCase.grade,
        });

        const callArgs = mockCreate.mock.calls[0][0];
        const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');

        expect(userMessage.content).toContain(testCase.expectedText);
      }
    });

    it('날씨 정보가 사용자 프롬프트에 포함되어야 한다', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '추천' } }],
      });

      const manager = OpenAIManager.getInstance();
      await manager.generateClothingAdvice(mockWeatherData);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');

      expect(userMessage.content).toContain('10°C');
      expect(userMessage.content).toContain('8°C');
      expect(userMessage.content).toContain('5°C');
      expect(userMessage.content).toContain('15°C');
      expect(userMessage.content).toContain('맑음');
    });

    it('시스템 프롬프트에 현재 날짜와 계절이 포함되어야 한다', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '추천' } }],
      });

      const manager = OpenAIManager.getInstance();
      await manager.generateClothingAdvice(mockWeatherData);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((m: { role: string }) => m.role === 'system');

      const today = new Date().toISOString().split('T')[0];
      expect(systemMessage.content).toContain(today);
      expect(systemMessage.content).toMatch(/(봄|여름|가을|겨울)/);
    });

    it('사용자 프롬프트에 습도와 일교차 정보가 포함되어야 한다', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '추천' } }],
      });

      const manager = OpenAIManager.getInstance();
      await manager.generateClothingAdvice(mockWeatherData);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');

      expect(userMessage.content).toContain('60%');
      expect(userMessage.content).toContain('일교차 10°C');
    });

    it('시스템 프롬프트에 체감온도별 옷차림 기준이 포함되어야 한다', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '추천' } }],
      });

      const manager = OpenAIManager.getInstance();
      await manager.generateClothingAdvice(mockWeatherData);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((m: { role: string }) => m.role === 'system');

      expect(systemMessage.content).toContain('4°C 이하');
      expect(systemMessage.content).toContain('패딩');
      expect(systemMessage.content).toContain('28°C 이상');
    });
  });
});
