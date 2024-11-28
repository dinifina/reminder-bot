const moment = require('moment');
const { Client, Collection, GatewayIntentBits, Guild } = require('discord.js');
const { mongoose, ObjectId } = require('mongoose');
const { token, dbUri } = require('../config.json');
const { parseCronExpression } = require('cron-schedule');
const fs = require('node:fs');
const path = require('node:path');
const Reminder = require('./Schemas/remindSchema.js');

const client = new Client({intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
]});

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data or "execute property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

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

            const mentionable = reminder.User[0];
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
            } else {
                    const cronJob = parseCronExpression(reminder.CronExpression);
                    const newDate = cronJob.getNextDate();

                    reminder.Time = newDate;
                    await reminder.save();
            }

            channel.send(message);
        }
    }
}

setInterval(checkReminders, 30000);

client.login(token);