const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist-user')
    .setDescription('Add a user to the global blacklist')
    .addStringOption(option =>
      option.setName('discord-id')
        .setDescription('Discord ID of the user to blacklist')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for blacklisting')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('proof')
        .setDescription('Proof (PDF or image)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {  // ← MAKE SURE THIS IS async
    await interaction.reply({ content: '🔄 Processing blacklist request...', ephemeral: true });
    
    // Check if command is used in staff server
    const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    if (!guildSettings || !guildSettings.isStaffServer) {
      return interaction.editReply('❌ This command can only be used in the staff server.');
    }

    // Check for staff role
    const staffRole = interaction.guild.roles.cache.get(process.env.STAFF_ROLE_ID);
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
      return interaction.editReply('❌ You do not have permission to use this command.');
    }

    const discordId = interaction.options.getString('discord-id');
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');
    const addedBy = interaction.user.id;

    try {
      // Check if already blacklisted
      const existing = await Blacklist.findOne({ discordId });
      if (existing) {
        return interaction.editReply('⚠️ This user is already blacklisted.');
      }

      // Fetch user info from Discord API
      let username = 'Unknown';
      try {
        const user = await interaction.client.users.fetch(discordId);
        username = user.tag;
      } catch (error) {
        console.log(`Could not fetch user ${discordId}: ${error.message}`);
      }

      // Ban user from all servers the bot is in
      const guilds = interaction.client.guilds.cache;
      let banCount = 0;
      const bannedFromServers = [];
      
      for (const [guildId, guild] of guilds) {
        try {
          // Skip staff server
          if (guildId === process.env.GUILD_ID) continue;
          
          // FIX: Make sure this await is inside async function
          const member = await guild.members.fetch(discordId).catch(() => null);
          if (member) {
            await member.ban({ reason: `Global Blacklist: ${reason}` });
            banCount++;
            
            // Track this ban
            bannedFromServers.push({
              guildId: guildId,
              guildName: guild.name
            });
            
            // Send DM to banned user
            try {
              const dmEmbed = new EmbedBuilder()
                .setTitle('🚨 You have been banned')
                .setDescription(`You have been banned from **${guild.name}**`)
                .addFields(
                  { name: 'Reason', value: reason },
                  { name: 'Blacklist ID', value: '' } // Will add after save
                )
                .setColor('#FF0000')
                .setTimestamp();
              
              await member.send({ embeds: [dmEmbed] });
            } catch (dmError) {
              console.log(`Could not DM user ${username}`);
            }
          }
        } catch (error) {
          console.error(`Error banning user in guild ${guild.name}:`, error);
        }
      }

      // Create blacklist entry with ban tracking
      const blacklistEntry = new Blacklist({
        discordId,
        username,
        reason,
        proof: proof ? proof.url : null,
        addedBy,
        isGlobal: true,
        bannedFrom: bannedFromServers
      });

      await blacklistEntry.save();

      // Update DM with blacklist ID
      // (You can't update the DM, but you can send a new one if needed)

      // Send confirmation
      const embed = new EmbedBuilder()
        .setTitle('✅ User Blacklisted')
        .setDescription(`**User:** ${username} (${discordId})`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Proof', value: proof ? `[View Proof](${proof.url})` : 'No proof provided' },
          { name: 'Banned From', value: `${banCount} server(s)` },
          { name: 'Added By', value: `<@${addedBy}>` },
          { name: 'Blacklist ID', value: blacklistEntry._id.toString() }
        )
        .setColor('#00FF00')
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [embed] });

    } catch (error) {
      console.error('Error blacklisting user:', error);
      await interaction.editReply('❌ An error occurred while blacklisting the user.');
    }
  }
};