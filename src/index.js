require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const connectDB = require('./database/db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  
  console.log(`✅ Loaded event: ${event.name}`);
}

// Interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Error!', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Error!', ephemeral: true });
    }
  }
});

// Register commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const staffGuildId = process.env.GUILD_ID;
  
  try {
    console.log('🔄 Registering commands...');
    
    const globalCommands = [];
    const staffCommands = [];
    
    for (const [name, command] of client.commands) {
      if (['blacklist-user', 'unblacklist'].includes(name)) {
        staffCommands.push(command.data.toJSON());
      } else {
        globalCommands.push(command.data.toJSON());
      }
    }
    
    // Global commands
    if (globalCommands.length > 0) {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: globalCommands }
      );
      console.log(`✅ Registered ${globalCommands.length} global commands`);
    }
    
    // Staff commands
    if (staffCommands.length > 0 && staffGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, staffGuildId),
        { body: staffCommands }
      );
      console.log(`✅ Registered ${staffCommands.length} staff commands`);
    }
    
  } catch (error) {
    console.error('❌ Command registration error:', error);
  }
}

// Ready event
client.once('ready', async () => {
  console.log(`✅ Sentrify online as ${client.user.tag}`);
  
  client.user.setPresence({
    activities: [{ name: 'for safety violations', type: 3 }],
    status: 'online'
  });
  
  await connectDB();
  await registerCommands();
});

// Login
client.login(process.env.DISCORD_TOKEN);