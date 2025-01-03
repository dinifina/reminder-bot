import lookupSch from '../../Schemas/lookupSchema.js';
import moment from 'moment-timezone';
import { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonComponent } from 'discord.js';

async function generateEmbed(interaction, index) {
    const reminders = await lookupSch.find({ GuildId: interaction.guild.id }).populate('Reminder').exec();

    const current = reminders.slice(index, index+10);

    return new EmbedBuilder({
        title: `Showing reminders ${index + 1}-${index + current.length} out of ${reminders.length}`,
        fields: await Promise.all(
            current.map(async reminder => ({
                name: `ID: ${reminder.Code.toString()}`,
                // this is the ugliest thing i've done in my life
                value: `**Reminder:** ${reminder.Reminder.Reminder}
                **Time:** ${moment(reminder.Reminder.Time).tz(reminder.Reminder.Timezone).format("DD MMM YYYY hh:mm a")} **Timezone:** ${reminder.Reminder.Timezone}
                **Interval:** ${reminder.Reminder.Interval ? [reminder.Reminder.Interval] : ['once']}
                ----------------------`
            }))
        )
    })
}

export default {
    data: new SlashCommandBuilder()
        .setName('display-reminders')
        .setDescription('Display all reminders in the server'),
    async execute(interaction) {
        const backId = 'back';
        const forwardId = 'forward';
        const backButton = new ButtonComponent({
            style: 2,
            type: 2,
            emoji: { name: '⬅️' },
            custom_id: backId
        });

        const forwardButton = new ButtonComponent({
            style: 2,
            type: 2,
            emoji: { name: '➡️' },
            custom_id: forwardId
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
            components: canFitOnOnePage ? [] : [new ActionRowBuilder().addComponents([forwardButton])]
        })

        if (canFitOnOnePage) return;

        const collector = embedMessage.createMessageComponentCollector({
            filter: ({user}) => user.id === interaction.user.id
        })

        let currIndex = 0;
        collector.on('collect', async interaction => {
            interaction.customId === backId ? (currIndex -= 10) : (currIndex += 10);
            
            const row = new ActionRowBuilder().addComponents(
                ...(currIndex ? [backButton] : []),
                ...(currIndex + 10 < reminders.length ? [forwardButton] : [])
            )

            await interaction.update({
                embeds: [await generateEmbed(interaction, currIndex)],
                components: [row]
            })
        })
    }
}