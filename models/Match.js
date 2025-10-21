// models/Match.js
const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  player1: { type: Object, required: true },
  player2: { type: Object, required: true },
  mode: { type: String, enum: ["Free", "Box"], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Match", MatchSchema);
