require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const { subMinutes } = require("date-fns");

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

// initialize firebase
initializeApp({ credential: admin.credential.cert(serviceAccount) });

// initializer discord.js
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

  switch (interactionCustomId) {
    case "verify-roles": {
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

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  switch (interactionCustomId) {
    case "email-form": {
      const userId = interaction.user.id;
      const email = interaction.fields.getTextInputValue("emailInput");

      console.log("email-form", { userId, email });

      if (email) {
        const code = Math.random().toString().slice(2, 8);

        // will trigger api call that sends email via sendgrid
        await admin.firestore().collection("/verifications").add({
          guildId,
          userId,
          email,
          code,
          isVerified: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

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
        console.log("No email provided");
      }

      break;
    }

    case "code-form": {
      const code = interaction.fields.getTextInputValue("codeInput");

      const now = new Date();
      const timeWindow = admin.firestore.Timestamp.fromDate(
        subMinutes(now, process.env.VERIFICATION_TIME_WINDOW)
      );

      const verificationQuery = admin
        .firestore()
        .collection("/verifications")
        .where("guildId", "==", guildId)
        .where("userId", "==", userId)
        .where("code", "==", code)
        .where("timestamp", ">=", timeWindow)
        .limit(1);

      const verificationSnapshot = await verificationQuery.get();
      const verified = !verificationSnapshot.empty;

      if (verified) {
        let emailIsOnAirtableAllowlist = false;
        let emailIsOnInternalAllowlist = false;

        const verificationDocRef = verificationSnapshot.docs.at(0);
        const verificationDocData = verificationDocRef.data();

        const email = verificationDocData.email;

        const airtableRef = admin
          .firestore()
          .collection("/allowlists")
          .doc(guildId)
          .collection("integrations")
          .doc("airtable");

        const airtableSnapshot = await airtableRef.get();
        const hasAirtableIntegration = airtableSnapshot.exists;

        if (hasAirtableIntegration) {
          const airtableData = airtableSnapshot.data();

          if (airtableData) {
            try {
              const response = await axios.get(
                `https://api.airtable.com/v0/${airtableData.base}/${airtableData.table}`,
                {
                  headers: {
                    Authorization: `Bearer ${airtableData.key}`,
                  },
                  params: {
                    ["fields[]"]: airtableData.field,
                    filterByFormula: `IF({${airtableData.field}} = "${email}", 1, 0)`,
                    view: airtableData.view,
                    maxRecords: 1,
                    pageSize: 1,
                  },
                }
              );

              const responseData = response?.data;

              emailIsOnAirtableAllowlist =
                (responseData?.records ?? []).length > 0;
            } catch (err) {
              functions.logger.error(err);
            }
          }
        } else {
          const allowlistRef = admin
            .firestore()
            .collection("/allowlists")
            .doc(guildId)
            .collection("emails")
            .doc(email);

          const allowlistSnapshot = await allowlistRef.get();

          emailIsOnInternalAllowlist = allowlistSnapshot.exists;
        }

        const isOnAllowlist =
          emailIsOnAirtableAllowlist || emailIsOnInternalAllowlist;

        if (isOnAllowlist) {
          // will trigger api call to update discord role
          await verificationDocRef.ref.update({ isVerified: true });

          await interaction.reply({
            content: `🥳 Congratulations and welcome to the discord! Your email is verified and your roles will be updated shortly.`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `Sorry, it seems like the email you entered is not associated with a membership. Head on over to #tech-help and let us know.`,
            ephemeral: true,
          });
        }
      } else {
        await interaction.reply({
          content: `Sorry, the code you entered is invalid or has already expired.`,
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
