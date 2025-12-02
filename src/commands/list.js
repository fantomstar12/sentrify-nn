const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Blacklist = require('../database/models/Blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-global-blacklists')
    .setDescription('List all globally blacklisted users')
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const page = interaction.options.getInteger('page') || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    try {
      const total = await Blacklist.countDocuments({ isGlobal: true });
      const blacklists = await Blacklist.find({ isGlobal: true })
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limit);

      if (blacklists.length === 0) {
        return interaction.editReply('📭 No global blacklists found.');
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Global Blacklist Database')
        .setDescription(`Showing ${blacklists.length} of ${total} blacklisted users`)
        .setColor('#3498db')
        .setFooter({ text: `Page ${page} of ${Math.ceil(total / limit)}` })
        .setTimestamp();

      for (const entry of blacklists) {
        const date = `<t:${Math.floor(entry.addedAt.getTime() / 1000)}:R>`;
        embed.addFields({
          name: `${entry.username}`,
          value: `**ID:** ${entry.discordId}\n**Reason:** ${entry.reason}\n**Added:** ${date}\n────────────`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing blacklists:', error);
      await interaction.editReply('❌ An error occurred while fetching the blacklist.');
    }
  }
};