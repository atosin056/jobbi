import { Bot } from "grammy";
import type { Context } from "grammy";
import { db } from "./db/db.js";
import type User from "./types/index.js";
import { analyzeCv } from "./services/cv.js";

type UserState = "waiting_for_cv" | "cv_received";

const GENERIC_ERROR = "Something went wrong, try again.";

export class BotService {
  private bot: Bot;
  private userState = new Map<number, UserState>();

  constructor() {
    const token = process.env.BOT_TOKEN;
    if (!token) throw new Error("BOT_TOKEN is missing");

    this.bot = new Bot(token);
    this.commandHandler();
    this.messageHandler();
    this.bot.catch((err) => console.error("Bot error:", err));
  }

  private async handleStart(ctx: Context) {
    const firstName = ctx.from?.first_name;
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const lastName = ctx.from?.last_name ?? "";

    if (!userId || !chatId) {
      await ctx.reply("Unable to process your request.");
      return;
    }

    try {
      const [rows] = await db.query<User[]>(
        "SELECT * FROM users WHERE userId = ?",
        [userId]
      );

      if (rows.length > 0) {
        await ctx.reply(
`Ah ${firstName}, you're back! 😏 I'm still out here hunting, and the moment I find something, you'll be the first to know. 😉

Need anything else in the meantime? 🌚`
        );
        return;
      }

      await db.query(
        "INSERT INTO users (firstName, lastName, userId, chatId) VALUES (?, ?, ?, ?)",
        [firstName, lastName, userId, chatId]
      );

      await ctx.reply(
`Hey ${firstName}! 👋 I'm your personal job-hunting buddy. I'll keep an eye out for opportunities that match what you're looking for. Let's get you hired! 🚀`
      );
      await this.askForCv(ctx, userId);
    } catch (error) {
      console.error("Database error:", error);
      await ctx.reply(GENERIC_ERROR);
    }
  }

  private async askForCv(ctx: Context, userId: number) {
    this.userState.set(userId, "waiting_for_cv");
    await ctx.reply(
`Send me your CV as a PDF, and I'll analyse your experience, identify your professional niche, and find opportunities that match your skills. 🎯`
    );
  }

  private async handleCv(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply("Unable to process your request.");
      return;
    }
    await this.askForCv(ctx, userId);
  }

  private async handleDocument(ctx: Context) {
    const userId = ctx.from?.id;
    const doc = ctx.message?.document;
    if (!userId || !doc) return;

    if (this.userState.get(userId) !== "waiting_for_cv") {
      await ctx.reply("I wasn't expecting a file. Send /cv first.");
      return;
    }
    if (doc.mime_type !== "application/pdf") {
      await ctx.reply("Please send your CV as a PDF.");
      return;
    }
    if ((doc.file_size ?? 0) > 5 * 1024 * 1024) {
      await ctx.reply("That file is too big. Keep it under 5MB.");
      return;
    }

    try {
      await ctx.reply("Got it! 📄 Analysing your CV now, give me a few seconds. 🔍");
      await ctx.replyWithChatAction("typing");

      const file = await ctx.getFile();
      const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");

      const profile = await analyzeCv(base64);

      await db.query("UPDATE users SET cvProfile = ? WHERE userId = ?", [
        JSON.stringify(profile),
        userId,
      ]);

      this.userState.set(userId, "cv_received"); // only after success

      await ctx.reply(
`Done! ✅ Here's what I picked up:

Niche: ${profile.primaryNiche}
Level: ${profile.level}
Skills: ${profile.skills.slice(0, 8).join(", ")}
Roles I'll hunt for: ${profile.suggestedRoles.slice(0, 4).join(", ")}`
      );
    } catch (error) {
      // never log the download URL, it contains the bot token
      console.error("CV error:", error);
      await ctx.reply("I couldn't read that file. Try another PDF.");
    }
  }

  private commandHandler() {
    this.bot.command("start", (ctx) => this.handleStart(ctx));
    this.bot.command("cv", (ctx) => this.handleCv(ctx));
  }

  // commands must be registered BEFORE these
  private messageHandler() {
    this.bot.on("message:document", (ctx) => this.handleDocument(ctx));
    this.bot.on("message:text", (ctx) => this.handleText(ctx));
  }

  private async handleText(ctx: Context) {
    try {
      const text = ctx.message?.text;
      const userId = ctx.from?.id;
      if (!text || !userId) return;

      if (this.userState.get(userId) === "waiting_for_cv") {
        await ctx.reply("I'm waiting for your CV as a PDF. 📄 Send the file when you're ready.");
        return;
      }

      await ctx.replyWithChatAction("typing");

      // TODO: const reply = await runAgent(userId, text);
      await ctx.reply(
        "Oops! 😅 I don't recognise that. Try a valid command and let's keep things moving!"
      );
    } catch (err) {
      console.error(err);
      await ctx.reply(GENERIC_ERROR);
    }
  }

  async start() {
    await this.bot.start({
      onStart: (me) => console.log(`Bot @${me.username} running`),
    });
  }
}