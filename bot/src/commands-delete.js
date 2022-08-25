require("dotenv").config();

const admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const serviceAccount = require("../service-account-key.json");

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord.js");

initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const clientId = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_BOT_TOKEN;

const main = async () => {
  const guildIds = (
    await admin.firestore().collection("/servers").get()
  ).docs.map((doc) => doc.id);

  const rest = new REST({ version: "10" }).setToken(token);

  // for guild-based commands

  await Promise.all(
    guildIds.map(async (guildId) => {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: [],
        });
        console.log(`Successfully deleted all guild commands for ${guildId}.`);
      } catch (err) {
        console.error(err);
      }
    })
  );
};
main();
