import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { DailyNews } from './DailyNews';

/**
 * Webhook 클래스는 텔레그램 봇의 웹훅을 처리합니다.
 */
export class Webhook {
  private readonly telegraf: Telegraf;
  private dailyNews: DailyNews;
  private commandList: {
    name: string;
    fn: (ctx: any) => Promise<void>;
    description: string;
  }[] = [
    {
      name: 'news',
      fn: async (ctx: any): Promise<void> => {
        const messages = await this.dailyNews.getDailyNews();
        // 텔레그램 메시지 크기 제한을 고려하여 여러 메시지로 나누어 전송
        for (const message of messages) {
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          });
          // 텔레그램 API 제한 방지를 위한 짧은 지연
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      },
      description: 'IT/과학 관련 뉴스를 제공합니다.',
    },
  ];

  /**
   * Webhook 클래스의 생성자입니다.
   * @param {Telegraf} telegraf - 텔레그래프 객체
   * @param {DailyNews} dailyNews - DailyNews 객체
   */
  constructor(telegraf: Telegraf, dailyNews: DailyNews) {
    this.telegraf = telegraf;
    this.dailyNews = dailyNews;
    this.init();
  }

  /**
   * Webhook 인스턴스를 초기화합니다.
   */
  private init() {
    this.setStart();
    this.setHelp();
    this.setCommandList();
    this.setOnMessage();
  }

  /**
   * /start 명령어에 대한 핸들러를 설정합니다.
   * @private
   */
  private setStart() {
    this.telegraf.start((ctx) =>
      ctx.reply(`반갑습니다. /help 명령어로 제가 무엇을 할 수 있는지 알아보세요.`),
    );
  }

  /**
   * /help 명령어에 대한 핸들러를 설정합니다.
   * @private
   */
  private setHelp() {
    this.telegraf.help((ctx) => {
      const text = this.commandList
        .map(({ name, description }) => `/${name} - ${description}`)
        .join('\n');
      return ctx.reply(text);
    });
  }

  /**
   * 봇의 명령어 리스트를 설정합니다.
   * @private
   */
  private setCommandList() {
    this.commandList.forEach((command) => {
      const { name, fn } = command;
      this.telegraf.command(name, fn);
    });
  }

  /**
   * 모든 텍스트 메시지에 대한 핸들러를 설정합니다.
   * @private
   */
  private setOnMessage() {
    this.telegraf.on(message('sticker'), (ctx) => ctx.reply('👍'));
    this.telegraf.on(message('text'), async (ctx) => {
      const text = ctx.message.text;
      await ctx.reply(text);
    });
  }

  /**
   * 텔레그래프의 웹훅 콜백을 반환합니다.
   * @returns {OmitThisParameter<(path?: string, opts?: {secretToken?: string}) => (req: (http.IncomingMessage & {body?: Update | undefined}), res: http.ServerResponse<http.IncomingMessage>, next?: () => void) => Promise<void>>}
   */
  get webhookCallback() {
    return this.telegraf.webhookCallback.bind(this.telegraf);
  }
}
