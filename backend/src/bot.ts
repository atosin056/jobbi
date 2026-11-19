import { Bot } from "grammy";
import type { Context } from "grammy";

export class BotService {
  private bot: Bot;

  constructor() {
    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error("BOT_TOKEN is missing");

    this.bot = new Bot(token);
    this.commandHandler();
    this.messageHandler();
    this.bot.catch((err) => console.error("Bot error:", err));
  }

  private commandHandler() {
    this.bot.command("start", (ctx) => ctx.reply("Jobbi is alive"));
  }

  private messageHandler() {
    this.bot.on("message:text", (ctx) => this.handleText(ctx));
  }

  private async handleText(ctx: Context) {
    try {
      const text = ctx.message?.text;
      const userId = ctx.from?.id;
      if (!text || !userId) return;

      await ctx.replyWithChatAction("typing");

      // TODO: const reply = await runAgent(userId, text);
      await ctx.reply(`You said: ${text}`);
    } catch (err) {
      console.error(err);
      await ctx.reply("Something went wrong, try again.");
    }
  }

  async start() {
    await this.bot.start({
      onStart: (me) => console.log(`Bot @${me.username} running`),
    });
  }
}