const { mongoose, Schema } = require('mongoose');

// TODO: Change interval to include an executed value
let reminderSchema = new Schema({
    User: [Array],
    Time: { type: Date, default: Date.now},
    Timezone: String,
    Interval: { type: String},
    CronExpression: String,
    Reminder: String,
    ChannelId: String,
    GuildId: String
});

module.exports = mongoose.model('Reminder', reminderSchema);