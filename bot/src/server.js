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
  InteractionType,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
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

client.once("ready", () => console.log("✅ Discord Bot Ready!"));

//
//
// Handle slash commands
//
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

//
//
// Handle button commands
//
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const interactionCustomId = interaction.customId;
  console.log("BUTTON TRIGGER", { interactionCustomId });

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  switch (interactionCustomId) {
    case "verify-roles": {
      await admin.firestore().collection("/sessions").add({
        serverId: guildId,
        userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      const modal = new ModalBuilder()
        .setCustomId("email-form")
        .setTitle("Verify email");

      const emailInput = new TextInputBuilder()
        .setCustomId("emailInput")
        .setLabel("What's your membership email?")
        .setPlaceholder("someone@awesome.com")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(emailInput);

      modal.addComponents(actionRow);

      await interaction.showModal(modal);

      break;
    }

    case "verify-email": {
      const modal = new ModalBuilder()
        .setCustomId("code-form")
        .setTitle("Verify email");

      const codeInput = new TextInputBuilder()
        .setCustomId("codeInput")
        .setLabel("Enter the code we just sent you,")
        .setPlaceholder("e.g. 123456")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(codeInput);

      modal.addComponents(actionRow);

      await interaction.showModal(modal);

      break;
    }

    default: {
      await interaction.reply({
        content: `Sorry, something went wrong.`,
        ephemeral: true,
      });
      break;
    }
  }
});

//
//
// Handle modal form submissions
//
client.on("interactionCreate", async (interaction) => {
  if (interaction.type !== InteractionType.ModalSubmit) return;

  const interactionCustomId = interaction.customId;
  console.log("MODAL SUBMISION", { interactionCustomId });

  switch (interactionCustomId) {
    case "email-form": {
      const email = interaction.fields.getTextInputValue("emailInput");

      if (email) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("verify-email")
            .setLabel("Code Received")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content: `We sent a short code to ${email} to verify you have access to it. Please enter it below once you have recieved it and don't forget to check your spam/junk folders.`,
          ephemeral: true,
          components: [row],
        });
      } else {
      }

      break;
    }

    case "code-form": {
      const code = interaction.fields.getTextInputValue("codeInput");

      // TODO:
      const verified = false;

      if (verified) {
        await interaction.reply({
          content: `🥳 Congratulations and welcome to the discord! Your email is verified.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `Sorry, it seems like the email you entered is not associated with a membership. Head on over to #tech-help and let us know.`,
          ephemeral: true,
        });
      }

      break;
    }

    default: {
      await interaction.reply({
        content: `Sorry, something went wrong.`,
        ephemeral: true,
      });
      break;
    }
  }
});

/**
 *
 * Login bot
 *
 */

client.login(process.env.DISCORD_BOT_TOKEN);
