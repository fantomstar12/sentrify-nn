require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🧹 Cleaning up duplicate commands...');
    
    // Get current commands
    const commands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );
    
    console.log(`Found ${commands.length} commands currently registered`);
    
    // Find and remove duplicates
    const uniqueCommands = [];
    const seen = new Set();
    const duplicates = [];
    
    for (const command of commands) {
      if (!seen.has(command.name)) {
        seen.add(command.name);
        uniqueCommands.push(command);
      } else {
        duplicates.push(command);
        console.log(`Found duplicate: ${command.name} (ID: ${command.id})`);
      }
    }
    
    // Delete all duplicates
    for (const dup of duplicates) {
      await rest.delete(
        Routes.applicationCommand(process.env.CLIENT_ID, dup.id)
      );
      console.log(`🗑️  Deleted duplicate: ${dup.name}`);
    }
    
    console.log(`✅ Cleared ${duplicates.length} duplicate commands`);
    
    // Now register fresh commands (use your bot's registration)
    console.log('🔄 Restart your bot to register fresh commands...');
    
  } catch (error) {
    console.error('❌ Error cleaning commands:', error);
  }
})();