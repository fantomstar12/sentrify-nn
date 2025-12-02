const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-sentrify')
    .setDescription('Configure Sentrify for this server')
    .addChannelOption(option =>
      option.setName('log-channel')
        .setDescription('Channel for security logs')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('auto-ban')
        .setDescription('Enable auto-ban for blacklisted users')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const logChannel = interaction.options.getChannel('log-channel');
    const autoBan = interaction.options.getBoolean('auto-ban');

    try {
      const updates = {};
      
      if (logChannel) {
        updates.logChannelId = logChannel.id;
      }
      
      if (autoBan !== null) {
        updates.autoBanEnabled = autoBan;
      }

      const guildSettings = await GuildSettings.findOneAndUpdate(
        { guildId: interaction.guild.id },
        updates,
        { new: true, upsert: true }
      );

      let response = '✅ Sentrify configuration updated:\n';
      response += `• Auto-ban: ${guildSettings.autoBanEnabled ? '✅ Enabled' : '❌ Disabled'}\n`;
      response += `• Log channel: ${guildSettings.logChannelId ? `<#${guildSettings.logChannelId}>` : 'Not set'}\n`;
      response += `• Safety keywords: ${guildSettings.safetyKeywords.length} configured`;

      await interaction.editReply(response);

    } catch (error) {
      console.error('Error setting up Sentrify:', error);
      await interaction.editReply('❌ An error occurred during setup.');
    }
  }
};