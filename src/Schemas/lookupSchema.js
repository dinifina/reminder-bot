const { mongoose, Schema } = require('mongoose');
const { Reminder } = require('./remindSchema.js');

let lookupSchema = new Schema({
    GuildId: String,
    Code: Number,
    Reminder: { type: Schema.Types.ObjectId, ref: 'Reminder' }
});

module.exports = mongoose.model('Lookup', lookupSchema);