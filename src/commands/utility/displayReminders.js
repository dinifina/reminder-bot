const Reminder = require('../../Schemas/remindSchema');
const lookupSch = require('../../Schemas/lookupSchema');
const { SlashCommandBuilder, MessageActionRow, EmbedBuilder, ButtonComponent } = require('discord.js');

async function generateEmbed(interaction, index) {
    const reminders = await lookupSch.find({ GuildId: interaction.guild.id }).populate('Reminder').exec();

    const current = reminders.slice(index, index+10);

    return new EmbedBuilder({
        title: `Showing reminders ${index + 1}-${index + current.length} out of ${reminders.length}`,
        fields: await Promise.all(
            current.map(async reminder => ({
                name: `ID: ${reminder.Code.toString()}`,
                value: `  **Reminder:** ${reminder.Reminder}\n**Interval:** ${reminder.Interval ? [reminder.Interval] : ['once']}`
            }))
        )
    })
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('display-reminders')
        .setDescription('Display all reminders in the server'),
    async execute(interaction) {
        const backId = 'back';
        const forwardId = 'forward';
        const backButton = new ButtonComponent({
            style: 2,
            emoji: ':arrow_left:',
            customId: backId
        });

        const forwardButton = new ButtonComponent({
            style: 2,
            emoji: ':arrow_right:',
            customId: forwardId
        });

        const reminders = await lookupSch.find({
            GuildId: interaction.guild.id
        });

        if (reminders.length <= 0) {
            await interaction.reply('There are no reminders to display :frowning:');
            return;
        }

        const canFitOnOnePage = reminders.length <= 10;
        const embedMessage = await interaction.reply({
            embeds: [await generateEmbed(interaction, 0)],
            components: canFitOnOnePage ? [] : [new MessageActionRow({components: [forwardButton]})]
        })

        if (canFitOnOnePage) return;

        const collector = embedMessage.createMessageComponentCollector({
            filter: ({user}) => user.id === interaction.user.id
        })

        let currIndex = 0;
        collector.on('collect', async interaction => {
            interaction.customId === backId ? (currentIndex -= 10) : (currentIndex += 10);
            await interaction.update({
                components: [
                    ...(currentIndex ? [backButton] : []),
                    ...(currentIndex + 10 < reminders.length ? [forwardButton] : [])
                ]
            })
        })
    }
}