require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const { initializeApp } = require("firebase-admin/app");
const admin = require("firebase-admin");

const serviceAccount = require("../service-account-key.json");

const {
  Client,
  Collection,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/**
 *
 * Setup commands
 *
 */

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

/**
 *
 * Setup listeners
 *
 */

client.once("ready", () => console.log("Discord Bot Ready!"));

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

// Handle button commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId !== "verify-roles") return;

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const ref = await admin.firestore().collection("/sessions").add({
    serverId: guildId,
    userId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  const sessionId = ref.id;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setURL(`${process.env.APP_HOSTNAME}/verify?sid=${sessionId}`)
      .setLabel("Verify Email")
      .setStyle(ButtonStyle.Link)
  );

  await interaction.reply({
    content:
      "Please use the following link to verify your membership email. Note, this link will be only be valid for the next 5 minutes.",
    ephemeral: true,
    components: [row],
  });
});
/**
 *
 * Login bot
 *
 */

client.login(process.env.DISCORD_BOT_TOKEN);
