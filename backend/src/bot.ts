import { Bot } from "grammy";
import type { Context } from "grammy";
import { db } from "./db/db.js";
import type User from "./types/index.js";

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

  private async handleStart(ctx: Context) {
    // Check for the presence of the user's first name and ID
    const firstName = ctx.from?.first_name;
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const lastName = ctx.from?.last_name || '';

    if (!firstName || !userId || !chatId) {
      await ctx.reply("Unable to process your request.");
      return;
    }

    try {
        // Check if the user already exists in the database
        const [rows] = await db.query<User[]>('SELECT * FROM users WHERE chatId = ?', [chatId]);
        if (rows.length > 0) {
            await ctx.reply(`Ah ${firstName}, you're back! 😏 I'm still out here hunting, and the moment I find something, you'll be the first to know. 😉

Need anything else in the meantime? 🌚`);
            return;
        }
        else {
            const [result] = await db.query(
  "INSERT INTO users (firstName, lastName, userId, chatId) VALUES (?, ?, ?, ?)",
  [firstName, lastName, userId, chatId]
);
            await ctx.reply(`Hey ${firstName}! 👋 I'm your personal job-hunting buddy. I'll keep an eye out for opportunities that match what you're looking for. Let's get you hired! 🚀`);
        }

    } catch (error) {
        console.error("Database error:", error);
        await ctx.reply("Something went wrong, try again.");
    }

  }

  private handle


  private commandHandler() {
    this.bot.command("start", (ctx) => this.handleStart(ctx));
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
     await ctx.reply(`Oops! 😅 I don't recognise that. Try a valid command and let's keep things moving!`);
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