/**
 * smappee adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
let adapter;

var mqtt = require('mqtt');
var servloc;
var activePower


function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'solarlog'
    });

    adapter = new utils.Adapter(options);

// when adapter shuts down
adapter.on('unload', function (callback) {
    try {
        clearInterval(polling);
        adapter.log.info('[END] Stopping solarlog adapter...');
        adapter.setState('info.connection', false, true);
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            adapter.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
adapter.on('ready', function() {
    if (adapter.config.host) {
        adapter.log.info('[START] Starting solarlog adapter');
		adapter.setState('info.connection', true, true);
        main();
    } else adapter.log.warn('[START] No IP-address set');
});

return adapter;
} // endStartAdapter


function main() {

var client = mqtt.connect({host: 'localhost', port: 1883, username:'forelleblau', password:'62166216' });


client.on('connect', function(){
	adapter.log.info("MQTT connected");
client.subscribe('servicelocation/#');
client.on('message', function (topic, message) {

	var messageJ = JSON.parse((JSON.stringify(message)).toString());

	var topicarray = topic.split("/");
	adapter.log.debug("Topic: " + topicarray[2]);
	if(topicarray[2]=="config"){
			adapter.log.debug("servlocid= " + messageJ.serviceLocationId)
			adapter.log.debug("messageJ: " + messageJ[0]);
			servloc = JSON.stringify(messageJ)["serviceLocationId"];
			adapter.log.debug("Servicelocation ID: " + servloc);
		}

  adapter.log.info("Message: " +  message);
});
});

    adapter.subscribeStates('*');


} // endMain
