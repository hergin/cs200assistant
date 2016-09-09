if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./node_modules/botkit/lib/Botkit.js');
var os = require('os');
var csv = require('csv-parser');
var fs = require('fs');

var grades = [];

fs.createReadStream('cs200.csv')
	.pipe(csv())
	.on('data', function(data) {
		grades[data.slackID] = data;
	});

var controller = Botkit.slackbot({
    debug: true
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

var SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		logFilePath:'assistant.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
	log = SimpleNodeLogger.createSimpleLogger( opts );

controller.hears(['my information'], 'direct_message', function(bot, message) {
	bot.api.users.info({user:message.user}, function(err,res) {
		if(err) {
			bot.reply(message, 'Hello anonymous');
		} else {
			var info="";
			for(var prop in grades[res.user.name]) {
				if(grades[res.user.name].hasOwnProperty(prop)) {
					info+=prop+": *"+grades[res.user.name][prop]+"*\n";
				}
			}
			bot.reply(message, '_Here is the all information I have about you:_\n' + info);
			log.info(grades[res.user.name].slackID+" requested his/her information.");
		}
	});	
});

controller.hears(['my information'], 'direct_mention,mention', function(bot, message) {
	bot.api.users.info({user:message.user}, function(err,res) {
		if(err) {
			bot.reply(message, 'Hello anonymous');
		} else {
			bot.reply(message, "This is not a place to discuss private information "+grades[res.user.name].firstName+"\n"+"Ask me in a direct message ;)");
		}
	});	
});

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

	bot.api.users.info({user:message.user}, function(err,res) {
		if(err) {
			bot.reply(message, 'Hello anonymous');
		} else {
			bot.reply(message, 'Hello ' + grades[res.user.name].firstName + '!');
		}
	});
	
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}