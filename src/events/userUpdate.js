const { Events, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  name: Events.UserUpdate,
  async execute(oldUser, newUser) {
    try {
      console.log(`👤 User updated: ${newUser.tag}`);
      
      // Get all guilds where this user is a member
      const guilds = newUser.client.guilds.cache;
      
      for (const [guildId, guild] of guilds) {
        try {
          // Skip staff server
          if (guildId === process.env.GUILD_ID) continue;
          
          const member = await guild.members.fetch(newUser.id).catch(() => null);
          if (!member) continue;
          
          const guildSettings = await GuildSettings.findOne({ guildId: guild.id });
          if (!guildSettings || !guildSettings.autoBanEnabled) continue;
          
          const safetyKeywords = guildSettings.safetyKeywords || [
            'rape', 'mega', 'csam', 'child porn', 'loli', 'shota', 
            'incest', 'pedo', 'nude', 'cp', 'lolicon', 'shotacon',
            'predator', 'grooming', 'minor', 'underage'
          ];
          
          // Check username, display name, and tag
          const userFields = [
            newUser.username?.toLowerCase() || '',
            newUser.globalName?.toLowerCase() || '',
            newUser.tag?.toLowerCase() || ''
          ].join(' ');
          
          const foundKeywords = safetyKeywords.filter(keyword => 
            userFields.includes(keyword.toLowerCase())
          );
          
          if (foundKeywords.length > 0) {
            console.log(`⚠️  Safety keywords found for ${newUser.tag} in ${guild.name}: ${foundKeywords.join(', ')}`);
            
            try {
              // KICK instead of BAN
              await member.kick(`Safety keywords in profile: ${foundKeywords.join(', ')}`);
              console.log(`✅ Kicked ${newUser.tag} from ${guild.name} for keywords`);
              
              // Send warning DM
              try {
                const dmEmbed = new EmbedBuilder()
                  .setTitle('⚠️  You have been kicked')
                  .setDescription(`You were kicked from **${guild.name}** for having inappropriate content in your profile.`)
                  .addFields(
                    { name: 'Violation', value: `Found keywords: ${foundKeywords.join(', ')}` },
                    { name: 'Action Required', value: 'Please remove these keywords from your username, display name, or tag to rejoin.' }
                  )
                  .setColor('#FFA500')
                  .setTimestamp();
                
                await newUser.send({ embeds: [dmEmbed] });
              } catch (dmError) {
                console.log(`Could not DM user ${newUser.tag}`);
              }
              
              // Log to server if configured
              await logKickAction(guild, newUser, foundKeywords, guildSettings);
              
            } catch (kickError) {
              console.error(`Failed to kick ${newUser.tag}:`, kickError.message);
            }
          }
          
        } catch (guildError) {
          console.error(`Error checking ${newUser.tag} in guild ${guildId}:`, guildError.message);
        }
      }
      
    } catch (error) {
      console.error('Error in UserUpdate event:', error);
    }
  }
};

async function logKickAction(guild, user, keywords, guildSettings) {
  if (guildSettings.logChannelId) {
    try {
      const logChannel = guild.channels.cache.get(guildSettings.logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('⚠️  User Kicked for Profile Violation')
          .setDescription(`**User:** ${user.tag} (${user.id})`)
          .addFields(
            { name: 'Action', value: 'Kicked' },
            { name: 'Reason', value: `Safety keywords in profile: ${keywords.join(', ')}` },
            { name: 'Note', value: 'User was kicked (not banned) and can rejoin after fixing profile.' }
          )
          .setColor('#FFA500')
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (logError) {
      console.error('Failed to log kick action:', logError);
    }
  }
}