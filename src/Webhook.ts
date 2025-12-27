import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { DailyNews } from './DailyNews';

interface BotCommand {
  name: string;
  fn: (ctx: Context) => Promise<void>;
  description: string;
}

export class Webhook {
  private readonly telegraf: Telegraf;
  private dailyNews: DailyNews;
  private commandList: BotCommand[] = [
    {
      name: 'news',
      fn: async (ctx: Context): Promise<void> => {
        const messages = await this.dailyNews.getDailyNews();
        for (const msg of messages) {
          await ctx.reply(msg, {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      },
      description: 'IT/과학 관련 뉴스를 제공합니다.',
    },
  ];

  constructor(telegraf: Telegraf, dailyNews: DailyNews) {
    this.telegraf = telegraf;
    this.dailyNews = dailyNews;
    this.init();
  }

  private init() {
    this.setStart();
    this.setHelp();
    this.setCommandList();
    this.setOnMessage();
  }

  private setStart() {
    this.telegraf.start((ctx) =>
      ctx.reply(`반갑습니다. /help 명령어로 제가 무엇을 할 수 있는지 알아보세요.`),
    );
  }

  private setHelp() {
    this.telegraf.help((ctx) => {
      const text = this.commandList
        .map(({ name, description }) => `/${name} - ${description}`)
        .join('\n');
      return ctx.reply(text);
    });
  }

  private setCommandList() {
    this.commandList.forEach((command) => {
      const { name, fn } = command;
      this.telegraf.command(name, fn);
    });
  }

  private setOnMessage() {
    this.telegraf.on(message('sticker'), (ctx) => ctx.reply('👍'));
    this.telegraf.on(message('text'), async (ctx) => {
      const text = ctx.message.text;
      await ctx.reply(text);
    });
  }

  get webhookCallback() {
    return this.telegraf.webhookCallback.bind(this.telegraf);
  }
}
