import Reminder from '../../Schemas/remindSchema.js';
import Lookup from '../../Schemas/lookupSchema.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nuke-reminders')
        .setDescription('Deletes all reminders in server'),
    async execute(interaction) {
        const validResponses = ['yes', 'no'];

        await interaction.reply({
            content: '**NOTE: THIS ACTION CANNOT BE UNDONE!** \n Are you sure you want to delete ***all*** reminders in the server? [Yes/No]',
            fetchReply: true})
            .then(() => {
                interaction.channel.awaitMessages({ 
                    filter: response => {
                        return response.author.id === interaction.user.id &&
                            validResponses.includes(response.content.toLowerCase());
                    },
                    max: 1, 
                    time: 15_000, 
                    errors: ['time']})
                    .then(collected => {
                        if (collected.first().content.toLowerCase() === 'yes') {
                            // Delete all reminders in Guild from database
                            Reminder.deleteMany(
                                {
                                    GuildId: interaction.guild.id
                                })
                            .then(
                                function () {
                                    interaction.followUp(':white_check_mark: Deleted all reminders!');
                                }).catch(
                                    function (err) {
                                        console.err('Error: ', err);
                                        interaction.followUp(':x: Error occurred when deleting reminders');
                                    });
                            Lookup.deleteMany(
                                {
                                    GuildId: interaction.guild.id
                                })
                            .then(
                                function() {
                                    console.log('Removed lookup table for this server');
                                    return;
                                }).catch(
                                    function (err) {
                                        console.err('Error: ', err);
                                        interaction.followUp(':x: Error occurred when deleting reminders'); 
                                    }
                                )
                        } else if (collected.first().content.toLowerCase() === 'no') {
                            interaction.followUp(':x: Operation cancelled - No reminders deleted');
                        }
                    })
                    .catch(collected => {
                        interaction.followUp('Invalid response');
                    })
            })
    }
}