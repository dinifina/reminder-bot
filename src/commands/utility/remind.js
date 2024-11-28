const moment = require('moment-timezone');
const setReminder = require('../helpers/setReminder.js');
const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

function isValidDateTime(dateTime, timezone) {
    try {
        if (!moment(dateTime).isValid() || moment(dateTime, 'YYYY-MM-DD hh:mm a').isBefore(moment.tz(moment(), timezone))) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remind')
		.setDescription('Sets a reminder')
        .addStringOption(option => 
            option
            .setName('reminder')
            .setDescription('Your reminder')
            .setRequired(true)
        )
        .addStringOption(option =>
            option
            .setName('time')
            .setDescription('Time in hh:mm AM/PM format')
            .setRequired(true)
        )
        .addStringOption(option => 
            option
            .setName('date')
            .setDescription('Date in YYYY-MM-DD format')
            .setRequired(true)
        )
        .addStringOption(options => 
            options
            .setName('timezone')
            .setDescription('Timezone')
            .setRequired(true)
            .addChoices(
                { name: 'Asia/Qatar', value: 'Asia/Qatar'},
                { name: 'Asia/Kuala_Lumpur', value: 'Asia/Kuala_Lumpur'},
                { name: 'America/Tijuana', value: 'America/Tijuana'},
                { name: 'Australia/Sydney', value: 'Australia/Sydney'},
                { name: 'Asia/Manila', value: 'Asia/Manila'},
                { name: 'Europe/London', value: 'Europe/London'},
                { name: 'Asia/Jakarta', value: 'Asia/Jakarta'},
                { name: 'Europe/Amsterdam', value: 'Europe/Amsterdam'}
            )
        )
        .addStringOption(options =>
            options
            .setName('interval')
            .setDescription('Interval for reminder')
            .addChoices(
                { name: 'Daily', value: 'daily'},
                { name: 'Weekly', value: 'weekly'},
                { name: 'Monthly', value: 'monthly'}
            )
        ),
	async execute(interaction) {
        await interaction.deferReply();

        const reminder = interaction.options.getString('reminder');
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const interval = interaction.options.getString('interval');
        const timezone = interaction.options.getString('timezone');
        const time = interaction.options.getString('time');
        const dateTime = `${interaction.options.getString('date')} ${time.toUpperCase()}`;
        const convertedDateTime = moment.tz(dateTime, "YYYY-MM-DD hh:mm a", timezone);

        if (!isValidDateTime(convertedDateTime)) {
            await interaction.editReply('Invalid date/time');
            return;
        } else {
            const selectUsers = new UserSelectMenuBuilder()
                .setCustomId(interaction.id)
                .setPlaceholder('Select users')
                .setMinValues(0)
                .setMaxValues(25);
            
            const row = new ActionRowBuilder()
                .addComponents(selectUsers);

            let timerSec = 30;
            const response = await interaction.editReply({
                content: `Select users to remind: ${timerSec} seconds left`,
                components: [row],
            });

            // Allow user to select users in only 60 seconds
            const timer = setInterval(async () => {
                timerSec--;

                interaction.editReply({
                    content: `Select users to remind: ${timerSec}s left`,
                    components: [row],
                })

                if (timerSec <= 0) {
                    clearInterval(timer);

                    await interaction.editReply({
                        content: 'Times up!',
                        components: [],
                    });
                }
            }, 1000);

            // Get users to mention in reminder
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.UserSelect,
                filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
                time: 30_000,
            });

            let users = [];
            collector.on('collect', async (interaction) => {
                users = interaction.values;
                await interaction.reply({ content: `:notepad_spiral: Reminder set for ${dateTime}!`, ephemeral: true });
            });

            collector.on('end', async (collected) => {
                if (users.length > 0) {
                    try {
                        let message = `:notepad_spiral: Reminder to **${reminder}** for `; 
                        users.forEach( user => {
                            message += `<@${user}> `;
                        });
                        message += ` at **${dateTime} ${timezone} time!**`;
    
                        // call setReminder
                        setReminder(reminder, users, new Date(convertedDateTime), interval, channelId, guildId);
                        await interaction.followUp(message);
                    } catch (err) {
                        console.error(err);
                        await interaction.followUp(':x: Error occurred when setting reminder')
                    }

                } else {
                    await interaction.followUp('No users were selected for this reminder');
                }
            });
        }
	}
};