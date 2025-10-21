// models/User.js
const mongoose = require("mongoose");

const GameProfileSchema = new mongoose.Schema({
  pubgName: { type: String, default: "" },
  pubgId: { type: String, default: "" }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, default: "" }, // may start with @
  profile: { type: GameProfileSchema, default: {} },
  likes: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
