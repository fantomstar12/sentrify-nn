const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands for Sentrify'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Sentrify Commands')
      .setDescription('Anti-CSAM/Predator Protection Bot')
      .setColor('#3498db')
      .addFields(
        {
          name: '📋 Staff Commands (Staff Server Only)',
          value: '```/blacklist-user - Add user to global blacklist\n/unblacklist - Remove user from blacklist\n/search - Search for user in database\n/list-global-blacklists - List all blacklisted users\n/setup-sentrify - Configure bot for this server```'
        },
        {
          name: '🔧 Setup',
          value: '1. Add bot to your server\n2. Use `/setup-sentrify` to configure\n3. Bot will auto-ban users with inappropriate content'
        },
        {
          name: '⚠️ Auto-Detection',
          value: 'Bot automatically checks for inappropriate keywords in:\n• Usernames\n• Nicknames\n• Bios/Status'
        }
      )
      .setFooter({ text: 'Sentrify - Keeping communities safe' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};