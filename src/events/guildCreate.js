const { Events } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    try {
      const isStaffServer = guild.id === process.env.GUILD_ID;
      
      await GuildSettings.findOneAndUpdate(
        { guildId: guild.id },
        {
          guildName: guild.name,
          isStaffServer: isStaffServer,
          autoBanEnabled: !isStaffServer // Disable auto-ban in staff server
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Added guild: ${guild.name} (${guild.id}) - Staff Server: ${isStaffServer}`);
    } catch (error) {
      console.error('Error adding guild to database:', error);
    }
  }
};