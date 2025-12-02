const { Events, EmbedBuilder } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // Skip bot users
      if (member.user.bot) return;
      
      console.log(`🔍 Checking new member: ${member.user.tag} (${member.user.id}) in ${member.guild.name}`);
      
      const guildSettings = await GuildSettings.findOne({ guildId: member.guild.id });
      if (!guildSettings || !guildSettings.autoBanEnabled) return;

      // 1. Check against blacklist database - BAN blacklisted users
      const blacklisted = await Blacklist.findOne({ discordId: member.user.id });
      if (blacklisted) {
        console.log(`🚨 Blacklisted user joined: ${member.user.tag}`);
        
        try {
          await member.ban({ reason: `Global Blacklist: ${blacklisted.reason}` });
          
          // Update blacklist record with this ban
          if (!blacklisted.bannedFrom.some(g => g.guildId === member.guild.id)) {
            blacklisted.bannedFrom.push({
              guildId: member.guild.id,
              guildName: member.guild.name
            });
            await blacklisted.save();
          }
          
          // Send DM
          try {
            const dmEmbed = new EmbedBuilder()
              .setTitle('🚨 You have been banned')
              .setDescription(`You have been banned from **${member.guild.name}**`)
              .addFields(
                { name: 'Reason', value: blacklisted.reason },
                { name: 'Blacklist ID', value: blacklisted._id.toString() }
              )
              .setColor('#FF0000')
              .setTimestamp();
            
            await member.send({ embeds: [dmEmbed] });
          } catch (dmError) {
            console.log(`Could not DM user ${member.user.tag}`);
          }
          
          // Log action
          await logAction(member, `Blacklisted: ${blacklisted.reason}`, guildSettings, true);
          
        } catch (banError) {
          console.error(`Failed to ban ${member.user.tag}:`, banError);
          await logAction(member, `Failed to ban blacklisted user: ${banError.message}`, guildSettings, true);
        }
        return;
      }

      // 2. Enhanced safety keyword check - KICK (not ban) users with keywords
      const safetyKeywords = guildSettings.safetyKeywords || [
        'rape', 'mega', 'csam', 'child porn', 'loli', 'shota', 
        'incest', 'pedo', 'nude', 'cp', 'lolicon', 'shotacon',
        'predator', 'grooming', 'minor', 'underage'
      ];
      
      // Check multiple fields
      const fieldsToCheck = [
        member.user.username,
        member.user.globalName || '',
        member.nickname || '',
        member.user.tag
      ].map(field => field ? field.toLowerCase() : '');
      
      // Join all fields for checking
      const allText = fieldsToCheck.join(' ');
      
      const foundKeywords = safetyKeywords.filter(keyword => {
        const keywordLower = keyword.toLowerCase();
        // More thorough checking
        return allText.includes(keywordLower) || 
               member.user.username.toLowerCase().includes(keywordLower) ||
               (member.user.globalName && member.user.globalName.toLowerCase().includes(keywordLower));
      });
      
      if (foundKeywords.length > 0) {
        console.log(`⚠️ Safety keywords detected for ${member.user.tag}: ${foundKeywords.join(', ')}`);
        
        try {
          // KICK instead of BAN for keyword violations
          await member.kick(`Safety keywords in profile: ${foundKeywords.join(', ')}`);
          console.log(`✅ Kicked ${member.user.tag} from ${member.guild.name}`);
          
          // Send warning DM
          try {
            const dmEmbed = new EmbedBuilder()
              .setTitle('⚠️ You have been kicked')
              .setDescription(`You were kicked from **${member.guild.name}** for having inappropriate content in your profile.`)
              .addFields(
                { name: 'Violation', value: `Found keywords: ${foundKeywords.join(', ')}` },
                { name: 'Action Required', value: 'Please remove these keywords from your username, display name, or tag to rejoin.' }
              )
              .setColor('#FFA500')
              .setTimestamp();
            
            await member.user.send({ embeds: [dmEmbed] });
          } catch (dmError) {
            console.log(`Could not DM user ${member.user.tag}`);
          }
          
          // Log action (kick, not ban)
          await logAction(member, `Safety keywords: ${foundKeywords.join(', ')}`, guildSettings, false);
          
        } catch (kickError) {
          console.error(`Failed to kick ${member.user.tag} for keywords:`, kickError.message);
          await logAction(member, `Failed to kick for keywords: ${kickError.message}`, guildSettings, false);
        }
      } else {
        console.log(`✅ ${member.user.tag} passed safety checks`);
      }
      
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  }
};

// Helper function for logging
async function logAction(member, reason, guildSettings, isBan = true) {
  if (guildSettings.logChannelId) {
    try {
      const logChannel = member.guild.channels.cache.get(guildSettings.logChannelId);
      if (logChannel) {
        const actionType = isBan ? 'Banned' : 'Kicked';
        const title = isBan ? '🚨 User Banned' : '⚠️ User Kicked';
        const color = isBan ? '#FF0000' : '#FFA500';
        const note = isBan ? '' : '\n**Note:** User was kicked (not banned) and can rejoin after fixing their profile.';
        
        const logEmbed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(`**User:** ${member.user.tag} (${member.user.id})`)
          .addFields(
            { name: 'Action', value: actionType },
            { name: 'Reason', value: reason }
          )
          .setColor(color)
          .setTimestamp();
        
        if (!isBan) {
          logEmbed.addFields({ name: 'Note', value: 'User can rejoin after removing keywords from their profile.' });
        }
        
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (logError) {
      console.error('Failed to log action:', logError);
    }
  }
}