const admin = require("firebase-admin");

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-discord-permission-bot")
    .setDescription(
      "Sets up the permission bot to handle the permission handshake."
    ),
  async execute(interaction) {
    console.log(interaction);

    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    await admin.firestore().collection("/servers").doc(guildId).set({
      roles: [],
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify-roles")
        .setLabel("Let's go!")
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("Verify your membership")
      .setDescription(
        "To unlock member-exclusive channels and discussions, please verify your membership status. This is quick and easy and only requires you verify your membership email."
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
