// models/Queue.js
const mongoose = require("mongoose");

const QueueSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  username: { type: String, default: "" },
  pubgName: { type: String, default: "" },
  pubgId: { type: String, default: "" },
  mode: { type: String, enum: ["Free", "Box"], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Queue", QueueSchema);
