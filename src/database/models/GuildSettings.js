const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  guildName: {
    type: String,
    required: true
  },
  isStaffServer: {
    type: Boolean,
    default: false
  },
  safetyKeywords: {
    type: [String],
    default: process.env.SAFETY_KEYWORDS ? process.env.SAFETY_KEYWORDS.split(',') : [
      'rape', 'mega', 'csam', 'child porn', 'loli', 'shota', 
      'incest', 'pedo', 'nude', 'cp', 'lolicon', 'shotacon',
      'predator', 'grooming', 'minor', 'underage'
    ]
  },
  autoBanEnabled: {
    type: Boolean,
    default: true
  },
  logChannelId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);