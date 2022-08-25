require("dotenv").config();

const admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const serviceAccount = require("../service-account-key.json");

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const clientId = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_BOT_TOKEN;

const guildIds = (
  await admin.firestore().collection("/servers").get()
).docs.map((doc) => doc.id);

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

await Promise.all(
  guildIds.map(async (guildId) => {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(
        `Successfully registered application commands for ${guildId}.`
      );
    } catch (err) {
      console.error(err);
    }
  })
);
