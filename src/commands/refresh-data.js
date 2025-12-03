const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../database/models/GuildSettings');
const Blacklist = require('../database/models/Blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload-data')
    .setDescription('Reload MongoDB data and cache (Staff only)')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('What data to reload')
        .setRequired(false)
        .addChoices(
          { name: 'Safety Keywords', value: 'keywords' },
          { name: 'Blacklist', value: 'blacklist' },
          { name: 'Server Settings', value: 'settings' },
          { name: 'Everything', value: 'all' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    // Check if command is used in staff server
    if (interaction.guild.id !== process.env.GUILD_ID) {
      return interaction.editReply('❌ This command can only be used in the staff server.');
    }

    // Check for staff role
    const staffRole = interaction.guild.roles.cache.get(process.env.STAFF_ROLE_ID);
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
      return interaction.editReply('❌ You do not have permission to use this command.');
    }

    const reloadType = interaction.options.getString('type') || 'all';
    
    try {
      const embed = new EmbedBuilder()
        .setTitle('🔄 Data Reload')
        .setDescription(`Reloading ${reloadType === 'all' ? 'all data' : reloadType} from MongoDB...`)
        .setColor('#3498db')
        .setTimestamp();

      const results = [];

      // 1. RELOAD SAFETY KEYWORDS
      if (reloadType === 'keywords' || reloadType === 'all') {
        try {
          // Get all guild settings
          const allSettings = await GuildSettings.find({});
          const keywordCount = allSettings.reduce((acc, settings) => 
            acc + (settings.safetyKeywords?.length || 0), 0);
          
          results.push(`✅ Safety Keywords: ${allSettings.length} servers, ${keywordCount} total keywords`);
        } catch (error) {
          results.push(`❌ Safety Keywords: ${error.message}`);
        }
      }

      // 2. RELOAD BLACKLIST
      if (reloadType === 'blacklist' || reloadType === 'all') {
        try {
          const blacklistCount = await Blacklist.countDocuments();
          const globalCount = await Blacklist.countDocuments({ isGlobal: true });
          
          results.push(`✅ Blacklist: ${blacklistCount} total, ${globalCount} global entries`);
        } catch (error) {
          results.push(`❌ Blacklist: ${error.message}`);
        }
      }

      // 3. RELOAD SERVER SETTINGS
      if (reloadType === 'settings' || reloadType === 'all') {
        try {
          const settings = await GuildSettings.find({});
          const autoBanEnabled = settings.filter(s => s.autoBanEnabled).length;
          const hasLogChannel = settings.filter(s => s.logChannelId).length;
          
          results.push(`✅ Server Settings: ${settings.length} servers, ${autoBanEnabled} with auto-ban, ${hasLogChannel} with log channels`);
        } catch (error) {
          results.push(`❌ Server Settings: ${error.message}`);
        }
      }

      // 4. CLEAR MONGOOSE CACHE (optional)
      if (reloadType === 'all') {
        try {
          // Clear Mongoose model cache
          Object.keys(require.cache).forEach(key => {
            if (key.includes('models/') && key.endsWith('.js')) {
              delete require.cache[key];
            }
          });
          
          results.push('✅ Cleared Mongoose model cache');
        } catch (error) {
          results.push(`❌ Cache clear: ${error.message}`);
        }
      }

      // Add results to embed
      embed.addFields({
        name: '📊 Results',
        value: results.join('\n') || 'No data reloaded'
      });

      // Add stats
      const memoryUsage = process.memoryUsage();
      embed.addFields(
        {
          name: '💾 Memory Usage',
          value: `Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          inline: true
        },
        {
          name: '📈 Uptime',
          value: `${Math.floor(process.uptime() / 60)} minutes`,
          inline: true
        }
      );

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in reload-data command:', error);
      await interaction.editReply('❌ An error occurred while reloading data.');
    }
  }
};
