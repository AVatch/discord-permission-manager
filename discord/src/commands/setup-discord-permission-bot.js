const {
  SlashCommandBuilder,
  ActionRowBuilder,
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
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("primary")
        .setLabel("Primary")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: "Pong!", components: [row] });
  },
};
