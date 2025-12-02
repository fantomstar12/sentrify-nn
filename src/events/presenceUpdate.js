const { Events, EmbedBuilder } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  name: Events.PresenceUpdate,
  async execute(oldPresence, newPresence) {  // Make sure this is async
    try {
      if (!newPresence || newPresence.user.bot) return;
      
      const member = newPresence.member;
      if (!member) return;
      
      console.log(`🔍 Checking presence update for: ${member.user.tag}`);
      
      const guildSettings = await GuildSettings.findOne({ guildId: member.guild.id });
      if (!guildSettings || !guildSettings.autoBanEnabled) return;

      const safetyKeywords = guildSettings.safetyKeywords || [
        'rape', 'mega', 'csam', 'child porn', 'loli', 'shota', 
        'incest', 'pedo', 'nude', 'cp', 'lolicon', 'shotacon'
      ];
      
      let foundKeywords = [];
      
      if (newPresence.activities && newPresence.activities.length > 0) {
        newPresence.activities.forEach(activity => {
          if (activity.state) {
            const stateLower = activity.state.toLowerCase();
            safetyKeywords.forEach(keyword => {
              if (stateLower.includes(keyword.toLowerCase())) {
                foundKeywords.push(keyword);
              }
            });
          }
          
          if (activity.name) {
            const nameLower = activity.name.toLowerCase();
            safetyKeywords.forEach(keyword => {
              if (nameLower.includes(keyword.toLowerCase())) {
                foundKeywords.push(keyword);
              }
            });
          }
        });
      }
      
      foundKeywords = [...new Set(foundKeywords)];
      
      if (foundKeywords.length > 0) {
        console.log(`⚠️ Safety keywords in status for ${member.user.tag}: ${foundKeywords.join(', ')}`);
        
        try {
          await member.kick(`Safety violation in status: ${foundKeywords.join(', ')}`);
          console.log(`✅ Kicked ${member.user.tag} for status violation`);
          
          if (guildSettings.logChannelId) {
            const logChannel = member.guild.channels.cache.get(guildSettings.logChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('⚠️ Status Violation Kick')
                .setDescription(`**User:** ${member.user.tag} (${member.user.id})`)
                .addFields(
                  { name: 'Keywords Found', value: foundKeywords.join(', ') },
                  { name: 'Action', value: 'Kicked (not banned)' },
                  { name: 'Note', value: 'User can rejoin after fixing their status.' }
                )
                .setColor('#FFA500')
                .setTimestamp();
              
              await logChannel.send({ embeds: [logEmbed] });
            }
          }
          
        } catch (kickError) {
          console.error(`Failed to kick ${member.user.tag}:`, kickError);
        }
      }
      
    } catch (error) {
      console.error('Error in presenceUpdate event:', error);
    }
  }
};