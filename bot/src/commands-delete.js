require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord.js");

const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;

const rest = new REST({ version: "10" }).setToken(token);

// for guild-based commands
rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
  .then(() => console.log("Successfully deleted all guild commands."))
  .catch(console.error);
