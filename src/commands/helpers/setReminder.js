const reminderSch = require('../../Schemas/remindSchema');
console.log('remindersch: ', reminderSch);

function generateCronJob(dateTime, interval) {
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const day = dateTime.getDay();
    const month = dateTime.getMonth();

    switch (interval) {
        case 'daily':
            return `${minute} ${hour} * * *`;
        case 'weekly':
            return `${minute} ${hour} * * ${day}`;
        case 'monthly':
            return `${minute} ${hour} * ${month} ${day}`;
        default:
            return '-1';
    }
}

async function setReminder(reminder, reminderUsers, reminderTime, reminderInterval, ChannelId, GuildId) {
    try {
        await reminderSch.create({
            User: reminderUsers,
            Time: reminderTime,
            Interval: reminderInterval,
            CronExpression: generateCronJob(reminderTime, reminderInterval),
            Reminder: reminder,
            ChannelId: ChannelId,
            GuildId: GuildId
        });
        console.log('Successfully created reminder!');
    } catch (error) {
        console.error(error);
    }
}

module.exports = setReminder;