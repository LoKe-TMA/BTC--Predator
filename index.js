// index.js
require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const User = require("./models/User");
const Queue = require("./models/Queue");
const Match = require("./models/Match");

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const ADMIN_ID = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : null;

if (!BOT_TOKEN || !MONGO_URL) {
  console.error("Please set BOT_TOKEN and MONGO_URL in .env");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ---------- Helper utilities ----------
function mainKeyboard() {
  return Markup.keyboard([
    ["🎮 PUBG ID", "🔍 Find Match"],
    ["🏆 Leaderboard"]
  ]).resize();
}

function formatPlayerBlock(u) {
  const usernameLine = u.username ? `Telegram: ${u.username}` : `Telegram ID: ${u.telegramId}`;
  const nameLine = `In-Game Name: ${u.pubgName || "N/A"}`;
  const idLine = `In-Game ID: ${u.pubgId || "N/A"}`;
  const likesLine = `❤️ Likes: ${typeof u.likes === "number" ? u.likes : 0}`;
  return `${usernameLine}\n${nameLine}\n${idLine}\n${likesLine}`;
}

function sendMatchMessage(playerA, playerB, mode) {
  const header = "🔥 MATCH FOUND 🔥\n\n";
  const gameLine = `🎮 Game: PUBG (${mode})\n\n`;
  const middle = "          ⚔️ VS ⚔️\n\n";
  const text = `${header}${gameLine}${formatPlayerBlock(playerA)}\n\n${middle}${formatPlayerBlock(playerB)}\n\n💬 You can now message each other to set up the match.`;

  // Buttons: Like opponent, Report, Send Message (open chat)
  const urlToB = playerB.username ? `https://t.me/${playerB.username.replace(/^@/, "")}` : null;
  const urlToA = playerA.username ? `https://t.me/${playerA.username.replace(/^@/, "")}` : null;

  const buttonsForA = Markup.inlineKeyboard([
    [ Markup.button.callback("👍 Like Opponent", `like_${playerB.telegramId}`),
      Markup.button.callback("🚫 Report Player", `report_${playerB.telegramId}`) ],
    urlToB ? [ Markup.button.url("💬 Send Message", urlToB) ] : []
  ].filter(row => row.length > 0));

  const buttonsForB = Markup.inlineKeyboard([
    [ Markup.button.callback("👍 Like Opponent", `like_${playerA.telegramId}`),
      Markup.button.callback("🚫 Report Player", `report_${playerA.telegramId}`) ],
    urlToA ? [ Markup.button.url("💬 Send Message", urlToA) ] : []
  ].filter(row => row.length > 0));

  // Send messages
  return Promise.all([
    bot.telegram.sendMessage(playerA.telegramId, text, { reply_markup: buttonsForA.reply_markup }),
    bot.telegram.sendMessage(playerB.telegramId, text, { reply_markup: buttonsForB.reply_markup })
  ]);
}

// ---------- Bot start ----------
bot.start(async (ctx) => {
  // Ensure user exists in DB
  const tg = ctx.from;
  await User.updateOne(
    { telegramId: tg.id },
    { $set: { username: tg.username ? `@${tg.username}` : "", createdAt: new Date() } },
    { upsert: true }
  );
  await ctx.reply("Welcome to 1v1Hunter — PUBG 1v1 matchmaking bot!", mainKeyboard());
});

// ---------- PUBG ID setup ----------
bot.hears("🎮 PUBG ID", async (ctx) => {
  const tg = ctx.from;
  await ctx.reply("Please enter your PUBG In-Game Name:");
  // next message will be the name
  const nameListener = async (msgCtx) => {
    if (!msgCtx.message || !msgCtx.message.text) return;
    const pubgName = msgCtx.message.text.trim();
    // ask for ID
    await msgCtx.reply("Now enter your PUBG ID (numbers):");
    // second listener for id
    const idListener = async (idCtx) => {
      if (!idCtx.message || !idCtx.message.text) return;
      const pubgId = idCtx.message.text.trim();
      // save to user
      await User.findOneAndUpdate(
        { telegramId: tg.id },
        { $set: { username: tg.username ? `@${tg.username}` : "", "profile.pubgName": pubgName, "profile.pubgId": pubgId } },
        { upsert: true }
      );
      await idCtx.reply(`Saved! Your PUBG profile:\n• ${pubgName}\n• ID: ${pubgId}`, mainKeyboard());
      // remove id listener
      bot.off("text", idListener);
    };
    // attach second listener once
    bot.on("text", idListener);
    // remove name listener
    bot.off("text", nameListener);
  };
  bot.on("text", nameListener);
});

// ---------- Find Match flow ----------
bot.hears("🔍 Find Match", async (ctx) => {
  // Choose mode inline
  await ctx.reply("Choose Mode:", Markup.inlineKeyboard([
    [Markup.button.callback("🆓 Free", "mode_Free")],
    [Markup.button.callback("📦 Box", "mode_Box")]
  ]));
});

// When user selects mode
bot.action(/^mode_(Free|Box)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery(); // acknowledge button
    const mode = ctx.match[1];
    const tg = ctx.from;

    // Ensure user has profile saved
    const user = await User.findOne({ telegramId: tg.id });
    if (!user || !user.profile || !user.profile.pubgId) {
      await ctx.reply("Please set your PUBG profile first (🎮 PUBG ID).");
      return ctx.editMessageText("Please set your PUBG profile first (🎮 PUBG ID).");
    }

    // Add user to queue
    const queued = await Queue.create({
      telegramId: tg.id,
      username: user.username || `@${tg.username || tg.id}`,
      pubgName: user.profile.pubgName,
      pubgId: user.profile.pubgId,
      mode
    });

    // Try to find an opponent atomically:
    // find one other queue entry with same mode and different telegramId
    const opponent = await Queue.findOneAndDelete({
      mode,
      telegramId: { $ne: tg.id }
    });

    if (!opponent) {
      // No opponent yet -> tell the user to wait
      await ctx.editMessageText(`🔎 Finding a ${mode} match for you... Please wait. (You are queued)`);
    } else {
      // Found opponent -> remove current user's queue entry we just inserted
      await Queue.deleteOne({ _id: queued._id }).catch(() => {});
      // Fetch full user docs to get likes & username
      const userDoc = await User.findOne({ telegramId: tg.id }) || {};
      const oppUserDoc = await User.findOne({ telegramId: opponent.telegramId }) || {};

      // create match
      const matchId = uuidv4();
      await Match.create({
        matchId,
        player1: {
          telegramId: userDoc.telegramId,
          username: userDoc.username || `@${tg.username || tg.id}`,
          pubgName: userDoc.profile?.pubgName || queued.pubgName,
          pubgId: userDoc.profile?.pubgId || queued.pubgId,
          likes: userDoc.likes || 0
        },
        player2: {
          telegramId: opponent.telegramId,
          username: oppUserDoc.username || opponent.username,
          pubgName: opponent.pubgName,
          pubgId: opponent.pubgId,
          likes: oppUserDoc.likes || 0
        },
        mode
      });

      // send messages to both players
      await ctx.editMessageText("✅ Match found! Sending details...");
      await sendMatchMessage(
        {
          telegramId: userDoc.telegramId,
          username: userDoc.username || `@${tg.username || tg.id}`,
          pubgName: userDoc.profile?.pubgName || queued.pubgName,
          pubgId: userDoc.profile?.pubgId || queued.pubgId,
          likes: userDoc.likes || 0
        },
        {
          telegramId: opponent.telegramId,
          username: oppUserDoc.username || opponent.username,
          pubgName: opponent.pubgName,
          pubgId: opponent.pubgId,
          likes: oppUserDoc.likes || 0
        },
        mode
      );

      // increase matchesPlayed
      await User.updateOne({ telegramId: userDoc.telegramId }, { $inc: { matchesPlayed: 1 } }).catch(()=>{});
      await User.updateOne({ telegramId: opponent.telegramId }, { $inc: { matchesPlayed: 1 } }).catch(()=>{});
    }
  } catch (err) {
    console.error("mode action err:", err);
    try { await ctx.reply("An error occurred. Please try again."); } catch(e) {}
  }
});

// ---------- Like handler ----------
bot.action(/^like_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery("Thanks! You liked this player.");
  const targetId = Number(ctx.match[1]);
  // increment likes on target user
  await User.findOneAndUpdate({ telegramId: targetId }, { $inc: { likes: 1 } }, { upsert: true });
  try {
    await ctx.reply("✅ You liked the opponent.");
  } catch (e) {}
});

// ---------- Report handler ----------
bot.action(/^report_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery("Report sent to admin.");
  const targetId = Number(ctx.match[1]);
  const reporter = ctx.from;
  const reportMsg = `🚨 Report Received\nReporter: ${reporter.username ? "@" + reporter.username : reporter.id}\nReported User Telegram ID: ${targetId}\nTime: ${new Date().toISOString()}`;
  if (ADMIN_ID) {
    await bot.telegram.sendMessage(ADMIN_ID, reportMsg).catch(()=>{});
  }
  // optionally store report in DB - omitted for brevity
  try { await ctx.reply("🚫 Your report has been submitted to the admin."); } catch(e) {}
});

// ---------- Leaderboard ----------
bot.hears("🏆 Leaderboard", async (ctx) => {
  const top = await User.find().sort({ likes: -1 }).limit(10);
  if (!top || top.length === 0) {
    return ctx.reply("No players yet. Be the first to register!");
  }
  let text = "🏆 TOP PLAYERS (by Likes)\n\n";
  top.forEach((p, i) => {
    text += `${i+1}. ${p.username || `ID:${p.telegramId}`} — ❤️ ${p.likes || 0}\n`;
  });
  await ctx.reply(text, mainKeyboard());
});

// Provide command as well
bot.command("leaderboard", async (ctx) => {
  return bot.telegram.sendMessage(ctx.chat.id, "Fetching leaderboard...").then(() => bot.hears("🏆 Leaderboard", ctx));
});

// ---------- Graceful shutdown ----------
process.once('SIGINT', () => { bot.stop('SIGINT'); mongoose.disconnect(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); mongoose.disconnect(); });

// ---------- Connect DB & Launch ----------
mongoose.connect(MONGO_URL, { autoIndex: true })
  .then(() => {
    bot.launch()
      .then(() => console.log("🚀 1v1Hunter Bot started"))
      .catch(err => console.error("Bot launch error:", err));
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
          
