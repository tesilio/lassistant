import { Webhook } from '../Webhook';
import { Telegraf } from 'telegraf';
import { DailyNews } from '../DailyNews';

describe('Webhook', () => {
  let mockTelegraf: jest.Mocked<Telegraf>;
  let mockDailyNews: jest.Mocked<DailyNews>;
  let startHandler: (ctx: any) => void;
  let helpHandler: (ctx: any) => void;
  let commandHandlers: Map<string, (ctx: any) => Promise<void>>;

  beforeEach(() => {
    commandHandlers = new Map();

    mockTelegraf = {
      start: jest.fn((handler) => {
        startHandler = handler;
      }),
      help: jest.fn((handler) => {
        helpHandler = handler;
      }),
      command: jest.fn((name: string, handler: (ctx: any) => Promise<void>) => {
        commandHandlers.set(name, handler);
      }),
      on: jest.fn(),
      webhookCallback: jest.fn().mockReturnValue(() => Promise.resolve()),
    } as unknown as jest.Mocked<Telegraf>;

    mockDailyNews = {
      getDailyNews: jest.fn(),
    } as unknown as jest.Mocked<DailyNews>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('Telegraf와 DailyNews를 받아 초기화합니다', () => {
      const webhook = new Webhook(mockTelegraf, mockDailyNews);

      expect(webhook).toBeDefined();
    });

    it('초기화 시 start 핸들러를 등록합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      expect(mockTelegraf.start).toHaveBeenCalledTimes(1);
    });

    it('초기화 시 help 핸들러를 등록합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      expect(mockTelegraf.help).toHaveBeenCalledTimes(1);
    });

    it('초기화 시 news 명령어를 등록합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      expect(mockTelegraf.command).toHaveBeenCalledWith('news', expect.any(Function));
    });

    it('초기화 시 sticker와 text 메시지 핸들러를 등록합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      expect(mockTelegraf.on).toHaveBeenCalledTimes(2);
    });
  });

  describe('/start 명령어', () => {
    it('/start 명령어에 환영 메시지를 응답합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      const mockCtx = {
        reply: jest.fn(),
      };

      expect(startHandler).toBeDefined();
      startHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        '반갑습니다. /help 명령어로 제가 무엇을 할 수 있는지 알아보세요.',
      );
    });
  });

  describe('/help 명령어', () => {
    it('/help 명령어에 사용 가능한 명령어 목록을 응답합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      const mockCtx = {
        reply: jest.fn(),
      };

      expect(helpHandler).toBeDefined();
      helpHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('/news - IT/과학 관련 뉴스를 제공합니다.');
    });
  });

  describe('/news 명령어', () => {
    it('/news 명령어에 뉴스 메시지를 응답합니다', async () => {
      new Webhook(mockTelegraf, mockDailyNews);

      const mockMessages = ['뉴스 1', '뉴스 2'];
      mockDailyNews.getDailyNews.mockResolvedValue(mockMessages);

      const mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
      };

      const newsHandler = commandHandlers.get('news');
      expect(newsHandler).toBeDefined();

      await newsHandler!(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledTimes(2);
      expect(mockCtx.reply).toHaveBeenNthCalledWith(1, '뉴스 1', {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });
      expect(mockCtx.reply).toHaveBeenNthCalledWith(2, '뉴스 2', {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });
    });

    it('/news 명령어에서 빈 배열을 받으면 아무것도 응답하지 않습니다', async () => {
      new Webhook(mockTelegraf, mockDailyNews);

      mockDailyNews.getDailyNews.mockResolvedValue([]);

      const mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
      };

      const newsHandler = commandHandlers.get('news');
      await newsHandler!(mockCtx);

      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    it('/news 명령어는 여러 메시지를 순차적으로 전송합니다', async () => {
      new Webhook(mockTelegraf, mockDailyNews);

      const mockMessages = ['뉴스 1', '뉴스 2', '뉴스 3'];
      mockDailyNews.getDailyNews.mockResolvedValue(mockMessages);

      const replyCalls: number[] = [];
      const mockCtx = {
        reply: jest.fn().mockImplementation(() => {
          replyCalls.push(Date.now());
          return Promise.resolve();
        }),
      };

      const newsHandler = commandHandlers.get('news');
      await newsHandler!(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledTimes(3);
      expect(mockCtx.reply).toHaveBeenNthCalledWith(1, '뉴스 1', expect.any(Object));
      expect(mockCtx.reply).toHaveBeenNthCalledWith(2, '뉴스 2', expect.any(Object));
      expect(mockCtx.reply).toHaveBeenNthCalledWith(3, '뉴스 3', expect.any(Object));
    });
  });

  describe('메시지 핸들러', () => {
    it('스티커 메시지에 👍로 응답합니다', () => {
      new Webhook(mockTelegraf, mockDailyNews);

      const onCalls = (mockTelegraf.on as jest.Mock).mock.calls;
      expect(onCalls.length).toBe(2);

      const stickerHandler = onCalls[0][1];
      const mockCtx = {
        reply: jest.fn(),
      };

      stickerHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('👍');
    });

    it('텍스트 메시지를 에코합니다', async () => {
      new Webhook(mockTelegraf, mockDailyNews);

      const onCalls = (mockTelegraf.on as jest.Mock).mock.calls;
      const textHandler = onCalls[1][1];
      const mockCtx = {
        message: {
          text: '안녕하세요!',
        },
        reply: jest.fn().mockResolvedValue(undefined),
      };

      await textHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('안녕하세요!');
    });
  });

  describe('webhookCallback', () => {
    it('Telegraf의 webhookCallback을 반환합니다', () => {
      const webhook = new Webhook(mockTelegraf, mockDailyNews);

      const callback = webhook.webhookCallback;

      expect(callback).toBeDefined();
      expect(mockTelegraf.webhookCallback.bind).toBeDefined();
    });

    it('webhookCallback은 Telegraf에 바인딩됩니다', () => {
      const boundCallback = jest.fn();
      mockTelegraf.webhookCallback = Object.assign(jest.fn(), {
        bind: jest.fn().mockReturnValue(boundCallback),
      });

      const webhook = new Webhook(mockTelegraf, mockDailyNews);
      const callback = webhook.webhookCallback;

      expect(mockTelegraf.webhookCallback.bind).toHaveBeenCalledWith(mockTelegraf);
      expect(callback).toBe(boundCallback);
    });
  });
});
