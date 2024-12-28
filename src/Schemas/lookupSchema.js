import mongoose from 'mongoose';
const { Schema } = mongoose;

let lookupSchema = new Schema({
    GuildId: String,
    Code: Number,
    Reminder: { type: Schema.Types.ObjectId, ref: 'Reminder' }
});

export default mongoose.model('Lookup', lookupSchema);