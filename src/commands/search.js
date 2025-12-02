const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for a user in the blacklist database')
    .addStringOption(option =>
      option.setName('identifier')
        .setDescription('Discord ID or mention')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const identifier = interaction.options.getString('identifier');
    // Extract ID from mention or use as-is
    const discordId = identifier.replace(/[<@!>]/g, '');

    try {
      const blacklistEntry = await Blacklist.findOne({ discordId });
      
      if (!blacklistEntry) {
        return interaction.editReply('✅ No blacklist records found for this user.');
      }

      const addedByUser = await interaction.client.users.fetch(blacklistEntry.addedBy).catch(() => null);
      
      const embed = new EmbedBuilder()
        .setTitle('🔍 Blacklist Record Found')
        .setDescription(`**User:** ${blacklistEntry.username} (${blacklistEntry.discordId})`)
        .addFields(
          { name: 'Reason', value: blacklistEntry.reason },
          { name: 'Added By', value: addedByUser ? `${addedByUser.tag}` : `ID: ${blacklistEntry.addedBy}` },
          { name: 'Date Added', value: `<t:${Math.floor(blacklistEntry.addedAt.getTime() / 1000)}:F>` },
          { name: 'Is Global', value: blacklistEntry.isGlobal ? 'Yes' : 'No' }
        )
        .setColor('#FFA500');
      
      if (blacklistEntry.proof) {
        embed.addFields({ name: 'Proof', value: `[View Proof](${blacklistEntry.proof})` });
      }
      
      if (blacklistEntry.notes) {
        embed.addFields({ name: 'Notes', value: blacklistEntry.notes });
      }
      
      embed.setFooter({ text: `Record ID: ${blacklistEntry._id}` });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error searching for user:', error);
      await interaction.editReply('❌ An error occurred while searching for the user.');
    }
  }
};