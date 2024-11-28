const Reminder = require('../../Schemas/remindSchema');
const lookupSch = require('../../Schemas/lookupSchema');

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

async function setReminder(reminder, users, time, timezone, interval, ChannelId, GuildId) {
    try {
        const reminders = await Reminder.find({ GuildId: GuildId }); 
        reminder = await Reminder.create({
            User: users,
            Time: time,
            Timezone: timezone,
            Interval: interval,
            CronExpression: generateCronJob(time, interval),
            Reminder: reminder,
            ChannelId: ChannelId,
            GuildId: GuildId
        });

        let lookupCode = 0;
        if (reminders.length > 0) {
            lookupCode = reminders.length;
        }

        await lookupSch.create({
            GuildId: GuildId,
            Code: lookupCode,
            Reminder: reminder._id
        });

        console.log('Successfully created reminder!');
    } catch (error) {
        console.error(error);
    }
}

module.exports = setReminder;