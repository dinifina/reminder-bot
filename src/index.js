import moment from 'moment';
import { Client, Collection, GatewayIntentBits, Guild } from 'discord.js';
import { mongoose, ObjectId } from 'mongoose';
import config from '../config.json' with { type: 'json' };
const { token, dbUri } = config;
import { parseCronExpression } from 'cron-schedule';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Reminder from './Schemas/remindSchema.js';
import Lookup from './Schemas/lookupSchema.js';

const client = new Client({intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
]});

client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

async function loadCommands() {
    for (const folder of commandFolders) {
        const commandsPath = join(foldersPath, folder);
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const command = await import(filePath);
            const commandModule = command.default || command;
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ('data' in commandModule && 'execute' in commandModule) {
                client.commands.set(commandModule.data.name, commandModule);
            } else {
                console.log(`index.js: [WARNING] The command at ${filePath} is missing a required "data or "execute property.`);
            }
        }
    }
}

await loadCommands();

const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

async function loadEventCommands() {
    for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        const event = await import(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

await loadEventCommands();

// Connect to mongo db

mongoose.connect(`${dbUri}`).
    catch(error => {throw Error(error)});

mongoose.connection.on('connected', () => console.log('Connected to database'));
mongoose.connection.on('open', () => console.log('Open'));
mongoose.connection.on('error', err => console.error('Connection failed: ', err));
mongoose.connection.on('disconnected', () => console.log('Disconnected'));

// TODO: Timezone shit
// Checks reminders every 30 secs and looks ahead 1 minute
async function checkReminders() {
    const reminders = await Reminder.find({
        Time: {
            $lte: new Date(Date.now()),
            $lte: moment().add(1, 'minute').toDate()
        }
    }).exec();

    if (reminders.length === 0) return;
    else {
        for await (const reminder of reminders) {
            if (moment(reminder.Time).isAfter(moment())) continue;

            const mentionable = reminder.User;
            let message = '';
            mentionable.forEach(mentionable => {
                message += `<@${mentionable}>`;
            });

            message += ` You have a reminder!: **${reminder.Reminder}**`;

            const guild = client.guilds.cache.get(reminder.GuildId);
            const channel = client.channels.cache.get(reminder.ChannelId);

            if (!guild || !channel) {
                await reminder.deleteOne();
                continue;
            } else if (reminder.CronExpression == "-1") {
                await reminder.deleteOne();
                await Lookup.deleteOne({ GuildId: reminder.GuildId });
            } else {
                    const cronJob = parseCronExpression(reminder.CronExpression);
                    const newDate = cronJob.getNextDate();

                    reminder.Time = newDate;
                    await reminder.save();
            }

            try {
                await channel.send(message);
            } catch (error) {
                if (error.code === 50001) {
                    console.log(`Cannot send messages in channel ${channel.name}: Missing permissions`);
                } else {
                    throw error;
                }
            }
        }
    }
}

setInterval(checkReminders, 30000);

client.login(token);