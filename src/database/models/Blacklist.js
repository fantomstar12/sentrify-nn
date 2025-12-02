const mongoose = require('mongoose');

const BlacklistSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  proof: {
    type: String,
    required: false
  },
  addedBy: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  isGlobal: {
    type: Boolean,
    default: true
  },
  // NEW: Track which servers user was banned from
  bannedFrom: [{
    guildId: String,
    guildName: String,
    bannedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // NEW: Track if user should be unbanned when removed from blacklist
  shouldUnbanOnRemoval: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('Blacklist', BlacklistSchema);