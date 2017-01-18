if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./node_modules/botkit/lib/Botkit.js');
var os = require('os');
var csv = require('csv-parser');
var fs = require('fs');
var storage = require('node-persist');
storage.initSync();

//var grades = [];

//fs.createReadStream('cs200.csv')
//	.pipe(csv())
//	.on('data', function(data) {
//		grades[data.slackID] = data;
//	});

var controller = Botkit.slackbot({
    debug: true
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

if(storage.keys().indexOf("requestedSettings")===-1)
    storage.setItemSync("requestedSettings",["name","bitbucketID","bitbucketemail","mybamaID"]);

var SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		logFilePath:'assistant.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
	log = SimpleNodeLogger.createSimpleLogger( opts );

var settingFunction = function(settingID) {
    var requested = storage.getItemSync("requestedSettings");
    if(requested.indexOf(settingID)===-1){
        requested.push(settingID);
        storage.setItemSync("requestedSettings",requested);
    }
    controller.hears([settingID+' (.*)'],'direct_message',function(bot,message){
        var input = message.match[1];
        var oldValue = storage.getItemSync(message.user);
		if(oldValue==undefined)
			oldValue={};
        oldValue[settingID] = input;
        storage.setItemSync(message.user,oldValue);
        bot.api.users.info({user:message.user}, function(err,res) {
            if(err){
                bot.reply(message, 'Some error occured and I am working to fix it. I may not be avaible now!');
            } else {
                if(!oldValue.hasOwnProperty('slackID')) {
                    oldValue['slackID'] = res.user.name;
                    storage.setItemSync(message.user,oldValue);
                }
                bot.reply(message,'Thanks for setting your '+settingID+'!');
            }
        });
    });
};

var requested = storage.getItemSync("requestedSettings");

requested.forEach(function(item){
    settingFunction(item);
});

controller.hears(['commands'],'direct_message',function(bot,message){
    var commands="`commands`\n`information`\n`grades`\n`hello`\n`roll tide`\n";
    storage.getItemSync("requestedSettings").forEach(function(item){
        commands+="`"+item+" VALUE`\n";
    });
    bot.reply(message,'Here are all commands available. Put the actual value instead of VALUE:\n'+ commands);
});

controller.hears(['information'],'direct_message',function(bot,message){
    var value = storage.getItemSync(message.user);
    bot.api.users.info({user:message.user}, function(err,res) {
        if(err){
            bot.reply(message, 'Some error occured and I am working to fix it. I may not be avaible now!');
        } else {
            var info="";
			for(var prop in value) {
				if(value.hasOwnProperty(prop)) {
					info+=prop+": *"+value[prop]+"*\n";
				}
			}
            bot.reply(message,'Here are your information:\n'+ info);
        }
    });
});

controller.hears(['ask (.*)'],'direct_message',function(bot,message){
    if(message.user=='U3TGG2W94'){
        var toAsk = message.match[1];
        var requested = storage.getItemSync("requestedSettings");
        if(requested.indexOf(toAsk)===-1){
            requested.push(toAsk);
            storage.setItemSync("requestedSettings",requested);
        }
        bot.api.users.list({},function(err,res) {
            if(err){
                bot.reply(message, 'Some error occured and I am working to fix it. I may not be avaible now!');
            } else {
                res.members.forEach(function(element) {
                    bot.say({text:'Please provide your *'+toAsk+'* information by typing `'+toAsk+' VALUE` to me!',channel:''+element.id});
                    settingFunction(toAsk);
                });
            }
        });
    }
});

controller.hears(['grades'], 'direct_message', function(bot, message) {
	bot.api.users.info({user:message.user}, function(err,res) {
		if(err) {
			bot.reply(message, 'Some error occured and I am working to fix it. I may not be avaible now!');
		} else {
            bot.reply(message, "Coming soon!");
/*			var info="";
			for(var prop in grades[res.user.name]) {
				if(grades[res.user.name].hasOwnProperty(prop)) {
					info+=prop+": *"+grades[res.user.name][prop]+"*\n";
				}
			}
			bot.reply(message, '_Here is the all of your grades:_\n' + info);
			log.info(grades[res.user.name].slackID+" requested his/her grades.");*/
		}
	});	
});

controller.hears(['grades'], 'direct_mention,mention', function(bot, message) {
	bot.api.users.info({user:message.user}, function(err,res) {
		if(err) {
			bot.reply(message, 'Some error occured and I am working to fix it. I may not be avaible now!');
		} else {
			bot.reply(message, "This is not a place to discuss private information "+res.user.name+"\n"+"Ask me in a direct message ;)");
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
            var userinfo = storage.getItemSync(message.user);
            var username = res.user.name;
            if(userinfo!=undefined && userinfo.hasOwnProperty("name"))
                username = userinfo['name'];
            bot.reply(message, 'Hello ' + username + '!');
		}
	});
	
});

controller.hears(['roll tide'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'elephant',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

	bot.reply(message, 'ROLLLLLLLL!');
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