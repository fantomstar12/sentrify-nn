const { Events, ActivityType } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Sentrify is online as ${client.user.tag}`);
    
    // Set bot status
    client.user.setActivity({
      name: 'for predators',
      type: ActivityType.Watching
    });

    // Register commands
    const { REST, Routes } = require('discord.js');
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
      console.log('🔄 Registering slash commands...');
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('✅ Slash commands registered!');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }

    // Initialize all guilds in database
    const guilds = client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      await GuildSettings.findOneAndUpdate(
        { guildId },
        {
          guildName: guild.name,
          isStaffServer: guildId === process.env.GUILD_ID
        },
        { upsert: true, new: true }
      );
    }
  }
};