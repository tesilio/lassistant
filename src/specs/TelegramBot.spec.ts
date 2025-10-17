import { TelegramBot } from '../TelegramBot';
import { Telegraf } from 'telegraf';
import { DailyNews } from '../DailyNews';
import environment from '../../config/environment';

describe('TelegramBot', () => {
  let telegramBot: TelegramBot;
  let mockTelegraf: jest.Mocked<Telegraf>;
  let mockDailyNews: jest.Mocked<DailyNews>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Telegraf 라이브러리를 모킹합니다
    mockTelegraf = {
      telegram: {
        sendMessage: jest.fn(),
      },
    } as any;

    // DailyNews 클래스를 모킹합니다
    mockDailyNews = {
      getDailyNews: jest.fn(),
    } as any;

    telegramBot = new TelegramBot(mockTelegraf, mockDailyNews);

    // console.error를 모킹합니다
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // 타이머 모킹
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('메시지를 보내야 합니다', async () => {
    const chatId = environment.telegram.chatId;
    const message = 'Hello, testing!';

    await telegramBot.sendMessage(chatId, message);

    // Telegraf의 sendMessage 메소드가 올바른 인자들로 호출되었는지 검증합니다
    expect(mockTelegraf.telegram.sendMessage).toHaveBeenCalledWith(
      chatId,
      message,
      expect.objectContaining({
        parse_mode: 'Markdown',
        link_preview_options: {
          is_disabled: true,
        },
      }),
    );
  });

  it('에러 메시지를 보내야 합니다', async () => {
    const mockError = new Error('Mocked error');
    const mockedPath = '/mocked/file/path';

    await telegramBot.sendErrorMessage(mockError, mockedPath);

    // sendMessage 메소드가 에러 메시지와 함께 호출되었는지 검증합니다
    expect(mockTelegraf.telegram.sendMessage).toHaveBeenCalledWith(
      environment.telegram.ownerChatId,
      expect.stringContaining(`
Bot Error!
\`\`\`
Error: Mocked error
\`\`\`
`),
      expect.objectContaining({
        parse_mode: 'Markdown',
        link_preview_options: {
          is_disabled: true,
        },
      }),
    );
  });
});
