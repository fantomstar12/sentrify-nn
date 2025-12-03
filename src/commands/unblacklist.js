const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Remove a user from the global blacklist and optionally unban them')
    .addStringOption(option =>
      option.setName('discord-id')
        .setDescription('Discord ID of the user to unblacklist')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removal')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('unban')
        .setDescription('Unban them from all servers?')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ content: '<a:sentrify_spin:1445512589894483968> Processing unblacklist request...', ephemeral: true });
    
    const discordId = interaction.options.getString('discord-id');
    const reason = interaction.options.getString('reason');
    const shouldUnban = interaction.options.getBoolean('unban') ?? true;

    try {
      // Find the blacklist entry FIRST
      const blacklistEntry = await Blacklist.findOne({ discordId });
      if (!blacklistEntry) {
        return interaction.editReply('❌ This user is not blacklisted.');
      }

      const userInfo = blacklistEntry.username;
      const bannedFromServers = blacklistEntry.bannedFrom || [];
      
      // Store info for embed
      const embed = new EmbedBuilder()
        .setTitle('✅ User Unblacklisted')
        .setDescription(`**User:** ${userInfo} (${discordId})`)
        .addFields(
          { name: 'Previous Reason', value: blacklistEntry.reason },
          { name: 'Removal Reason', value: reason },
          { name: 'Removed By', value: `<@${interaction.user.id}>` }
        )
        .setColor('#00FF00')
        .setTimestamp();

      // UNBAN LOGIC - Do this BEFORE deleting the record
      let unbannedCount = 0;
      let failedUnbans = [];
      
      if (shouldUnban && bannedFromServers.length > 0) {
        embed.addFields({ 
          name: '🔓 Unban Process', 
          value: `Found ${bannedFromServers.length} server(s) to unban from...`,
          inline: false 
        });

        console.log(`🔓 Attempting to unban ${discordId} from ${bannedFromServers.length} servers`);

        for (const server of bannedFromServers) {
          try {
            const guild = interaction.client.guilds.cache.get(server.guildId);
            if (guild) {
              // Check if user is actually banned
              const banList = await guild.bans.fetch().catch(() => new Map());
              const isBanned = banList.has(discordId);
              
              if (isBanned) {
                await guild.bans.remove(discordId, `Blacklist revoked: ${reason}`);
                unbannedCount++;
                console.log(`✅ Unbanned ${discordId} from ${guild.name}`);
              } else {
                console.log(`ℹ️ User ${discordId} not banned in ${guild.name}, skipping`);
              }
            } else {
              console.log(`⚠️ Bot not in server ${server.guildName} (${server.guildId})`);
              failedUnbans.push(server.guildName);
            }
          } catch (unbanError) {
            console.error(`❌ Failed to unban ${discordId} from ${server.guildName}:`, unbanError.message);
            failedUnbans.push(server.guildName);
          }
        }
        
        if (unbannedCount > 0) {
          embed.addFields({ 
            name: '✅ Unban Results', 
            value: `Successfully unbanned from ${unbannedCount} server(s)`,
            inline: false 
          });
        }
        
        if (failedUnbans.length > 0) {
          embed.addFields({ 
            name: '⚠️ Failed Unbans', 
            value: `Could not unban from: ${failedUnbans.join(', ')}`,
            inline: false 
          });
        }
      } else if (shouldUnban) {
        embed.addFields({ 
          name: 'ℹ️ Unban Info', 
          value: 'No server ban records found for this user.',
          inline: false 
        });
      }

      // NOW delete from database AFTER unbanning
      await Blacklist.deleteOne({ discordId });
      console.log(`🗑️ Deleted blacklist record for ${discordId}`);

      await interaction.editReply({ content: null, embeds: [embed] });

    } catch (error) {
      console.error('❌ Error in unblacklist command:', error);
      await interaction.editReply('❌ An error occurred while unblacklisting the user.');
    }
  }
};
