/**
 * smappee adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
let adapter;
var port;
var host;
var username;
var password;
var mqtt = require('mqtt');
var servloc;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'smappee'
    });

    adapter = new utils.Adapter(options);

// when adapter shuts down
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('[END] Stopping smappee adapter...');
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
    adapter.setState('info.connection', true, true);
    main();
    });

return adapter;
} // endStartAdapter


function main() {

  host = adapter.config.host;
  port = adapter.config.port;
  username = adapter.config.username;
  password = adapter.config.password;

  var client = mqtt.connect({host: host, port: port, username: username, password: password });


  client.on('connect', function(){
	   adapter.log.info("MQTT connected");
     client.subscribe('servicelocation/#');
     client.on('message', function (topic, message) {
	      try{
	         var messageJ = JSON.parse(message);
	         var topicarray = topic.split("/");
	         adapter.log.debug("Topic: " + topicarray[2]);
	         switch(topicarray[2]) {
             case "config":
			          adapter.log.debug("servlocid= " + messageJ.serviceLocationId);
                adapter.setObjectNotExists('Servicelocations.' + topicarray[1], {
                  type: 'device',
                  role: '',
                  common: {
                  name: messageJ.serviceLocationId
                  },
                  native: {}
		              });
                  adapter.setObjectNotExists('Servicelocations.' + topicarray[1] +'.power', {
                    type: 'channel',
                    role: '',
                    common: {
                    name: "power"
                    },
                    native: {}
                  });
                  adapter.setObjectNotExists('Servicelocations.' + topicarray[1] +'.power.totalPower', {
                      type: 'state',
                			common: {
                				name: 'PAC',
                				desc: 'Power AC',
                				type: 'number',
                				role: "value.pac",
                				read: true,
                				write: false,
                				unit: "W"
                			},
                			native: {}
                		});
                    adapter.setObjectNotExists('Servicelocations.' + topicarray[1] +'.power.importEnergy', {
                        type: 'state',
                        common: {
                          name: 'consumption',
                          desc: 'Energy consumption',
                          type: 'number',
                          role: "value.consumption",
                          read: true,
                          write: false,
                          unit: "kWh"
                        },
                        native: {}
                      });
                      adapter.setObjectNotExists('Servicelocations.' + topicarray[1] +'.power.exportEnergy', {
                          type: 'state',
                          common: {
                            name: 'producion',
                            desc: 'Energy production',
                            type: 'number',
                            role: "value.production",
                            read: true,
                            write: false,
                            unit: "kWh"
                          },
                          native: {}
                        });
                        break;
                      case "realtime":
                        adapter.setState('Servicelocations.' + topicarray[1] +'.power.totalPower', messageJ.totalPower, true);
                        break;
			             		}

		} catch(e) {
				adapter.log.warn("JSON-parse-Fehler Message: " + e.message);
		}

  ;
});
});

    adapter.subscribeStates('*');


} // endMain

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} // endElse
