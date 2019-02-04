/**
 * smappee adapter
 */

/* jshint -W097 */ // jshint strict:false
/*jslint node: true */
'use strict';

const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
let adapter;
var port;
var host;
var username;
var password;
var tested;
var mqtt = require('mqtt');
var servloc;
var configtopics = [];
var configtopicsmaxlength = 8;
var inputchannelnumber = 0;
var phasenumbersused = [];


function startAdapter(options) {
  options = options || {};
  Object.assign(options, {
    name: 'smappee'
  });

  adapter = new utils.Adapter(options);

  // when adapter shuts down
  adapter.on('unload', function(callback) {
    try {
      adapter.log.info('[END] Stopping smappee adapter...');

      adapter.setState('info.connection', false, true);
      client.end();
    } catch (e) {
      callback();
    }
  });

  // is called if a subscribed object changes
  adapter.on('objectChange', function(id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
  });

  // is called if a subscribed state changes
  adapter.on('stateChange', function(id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
      adapter.log.info('ack is not set!');
    }
  });

  // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
  adapter.on('message', function(obj) {
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
  if (adapter.config.mqttusername) {
adapter.log.info('[START] Starting smappee adapter');
    adapter.setState('info.connection', true, true);
    main();
} else {adapter.log.warn('[START] MQTT usr/pwd not set yet')}
  });

  return adapter;
} // endStartAdapter


function main() {

  host = adapter.config.mqtthost;
  port = adapter.config.mqttport;
  username = adapter.config.mqttusername;
  password = adapter.config.mqttpassword;

  var client = mqtt.connect({
    host: host,
    port: port,
    username: username,
    password: password
  });


  client.on('connect', function() {
    adapter.log.info("MQTT connected");
    client.subscribe('servicelocation/#');
    client.on('message', function(topic, message) {
      try {
        var messageJ = JSON.parse(message);
        var topicarray = topic.split("/");
        adapter.log.debug("Topic: " + topicarray[2]);

        switch (topicarray[2]) {
          case "realtime":

            adapter.getObject('Servicelocations.' + topicarray[1] + '.Power.totalPower', function(err, obj) {
              if (obj) {
                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.totalPower', messageJ.totalPower, true);
              } else {
                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.totalPower', {
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
              }
            });

            adapter.getObject('Servicelocations.' + topicarray[1] + '.Power.voltage', function(err, obj) {
              if (obj) {
                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.voltage', messageJ.voltages[0].voltage, true);

              } else {
                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.voltage', {
                  type: 'state',
                  common: {
                    name: 'UAC',
                    desc: 'Voltage AC',
                    type: 'number',
                    role: "value.uac",
                    read: true,
                    write: false,
                    unit: "V"
                  },
                  native: {}
                });
              }
            });

            if (messageJ.totalExportEnergy != 0) {
              adapter.getObject('Servicelocations.' + topicarray[1] + '.Power.exportEnergy', function(err, obj) {
                if (obj) {
                  adapter.setState('Servicelocations.' + topicarray[1] + '.Power.ExportEnergy', 0.001 * Math.round(messageJ.totalExportEnergy / 3600), true);
                } else {
                  adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.exportEnergy', {
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
                }
              });

              for (var i = 0; i < messageJ.channelPowers.length; i++) {

                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].ctInput + ".phaseExportEnergy", {
                  type: 'state',
                  common: {
                    name: 'PhaseProducion',
                    desc: 'Energy production on Phase',
                    type: 'number',
                    role: "value.production",
                    read: true,
                    write: false,
                    unit: "kWh"
                  },
                  native: {}
                });
                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].ctInput + ".phaseExportEnergy", 0.001 * Math.round(messageJ.channelPowers[i].exportEnergy / 3600), true);

              }
            }



            if (messageJ.totalImportEnergy != 0) {
              adapter.getObject('Servicelocations.' + topicarray[1] + '.Power.importEnergy', function(err, obj) {
                if (obj) {
                  adapter.setState('Servicelocations.' + topicarray[1] + '.Power.importEnergy', 0.001 * Math.round(messageJ.totalImportEnergy / 3600), true);

                } else {
                  adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.importEnergy', {
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

                }
              });


              for (var i = 0; i < messageJ.channelPowers.length; i++) {
                adapter.log.debug("Import Energy, Bearbeite Phase Nr. :" + i);


                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].phaseId + ".phaseImportEnergy", {
                  type: 'state',
                  common: {
                    name: 'phaseImportEnergy',
                    desc: 'Energy consumption on Phase',
                    type: 'number',
                    role: "value.production",
                    read: true,
                    write: false,
                    unit: "kWh"
                  },
                  native: {}
                });

                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].phaseId + ".phaseImportEnergy", 0.001 * Math.round(messageJ.channelPowers[i].importEnergy / 3600), true);
                adapter.log.debug(" Wert Phase" + messageJ.channelPowers[i].phaseId + ": " + 0.001 * Math.round(messageJ.channelPowers[i].importEnergy / 3600));

              }
            }


            for (var phasecount = 0; phasecount < messageJ.channelPowers.length; phasecount++) {
              adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + phasecount + ".phasePower", {
                type: 'state',
                common: {
                  name: 'phasePower',
                  desc: 'PAC on phase',
                  type: 'number',
                  role: "value.phasePower",
                  read: true,
                  write: false,
                  unit: "W"
                },
                native: {}
              });
              adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + phasecount + ".phasePower", messageJ.channelPowers[phasecount].power, true);


              adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + phasecount + ".phaseId", {
                type: 'state',
                common: {
                  name: 'phaseId',
                  desc: 'Phase ID',
                  type: 'number',
                  role: "info.phaseId",
                  read: true,
                  write: false
                },
                native: {}
              });

              adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + phasecount + ".phaseId", messageJ.channelPowers[phasecount].phaseId, true);

            }
            break;


          case "config":
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Info.DeviceUUID', {
              type: 'state',
              common: {
                name: 'DeviceUUID',
                desc: 'Device UUID',
                type: 'string',
                role: "info.DeviceUUID",
                read: true,
                write: false
              },
              native: {}
            });
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Info.serialNumber', {
              type: 'state',
              common: {
                name: 'serialNumber',
                desc: 'Serial Number',
                type: 'string',
                role: "info.serialNumber",
                read: true,
                write: false
              },
              native: {}
            });
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Info.ServLocUUID', {
              type: 'state',
              common: {
                name: 'ServLocUUID',
                desc: 'Sercice Location UUID',
                type: 'string',
                role: "info.ServLocUUID",
                read: true,
                write: false
              },
              native: {}
            });
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Info.ServLocID', {
              type: 'state',
              common: {
                name: 'ServLocID',
                desc: 'Service Location ID',
                type: 'string',
                role: "info.ServLocID",
                read: true,
                write: false
              },
              native: {}
            });
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Info.firmwareV', {
              type: 'state',
              common: {
                name: 'firmwareV',
                desc: 'Firmware Version',
                type: 'string',
                role: "info.firmwareV",
                read: true,
                write: false
              },
              native: {}
            });
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Info.AggrPeriod', {
              type: 'state',
              common: {
                name: 'AggrPeriod',
                desc: 'Aggregation Period in Seconds',
                type: 'number',
                role: "value.AggrPeriod",
                read: true,
                write: false,
                unit: "s"
              },
              native: {}
            });
            adapter.setState('Servicelocations.' + topicarray[1] + '.Info.DeviceUUID', messageJ.deviceUuid, true);
            adapter.setState('Servicelocations.' + topicarray[1] + '.Info.serialNumber', messageJ.serialNumber, true);
            adapter.setState('Servicelocations.' + topicarray[1] + '.Info.ServLocUUID', messageJ.serviceLocationUuid, true);
            adapter.setState('Servicelocations.' + topicarray[1] + '.Info.ServLocID', messageJ.serviceLocationId, true);
            adapter.setState('Servicelocations.' + topicarray[1] + '.Info.firmwareV', messageJ.firmwareVersion, true);
            adapter.setState('Servicelocations.' + topicarray[1] + '.Info.AggrPeriod', messageJ.aggregationPeriodSeconds, true);
            break;

          case "channelConfig":
            for (var ileng = 0; ileng < messageJ.inputChannels.length; ileng++) {
              adapter.log.debug("Anzahl Channels: " + messageJ.inputChannels.length);
              if (messageJ.inputChannels[ileng].inputChannelType != "UNUSED") {
                adapter.log.debug("CT-Input " + messageJ.inputChannels[ileng].ctInput + " USED");
                phasenumbersused.push[messageJ.inputChannels[ileng].ctInput];
                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[ileng].ctInput + ".name", {
                  type: 'state',
                  common: {
                    name: 'ctInputName',
                    desc: 'Phase description of used CT',
                    type: 'string',
                    role: "info.phasename",
                    read: true,
                    write: false
                  },
                  native: {}
                });
                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[ileng].ctInput + ".inputChannelType", {
                  type: 'state',
                  common: {
                    name: 'inputChannelType',
                    desc: 'Type of input channel',
                    type: 'string',
                    role: "info.inputChannelType",
                    read: true,
                    write: false
                  },
                  native: {}
                });
                adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[ileng].ctInput + ".inputChannelConnection", {
                  type: 'state',
                  common: {
                    name: 'inputChannelConnection',
                    desc: 'System that input channel is connected to',
                    type: 'string',
                    role: "info.inputChannelConnection",
                    read: true,
                    write: false
                  },
                  native: {}
                });
                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[ileng].ctInput + ".name", messageJ.inputChannels[ileng].name, true);
                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[ileng].ctInput + ".inputChannelType", messageJ.inputChannels[ileng].inputChannelType, true);
                adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[ileng].ctInput + ".inputChannelConnection", messageJ.inputChannels[ileng].inputChannelConnection, true);
              }
            }
            break;
        }

      } catch (e) {
        adapter.log.warn("Datenimport - JSON-parse-Fehler Message: " + e.message);
      };
    });
  });
} //endMain

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
  module.exports = startAdapter;
} else {
  // or start the instance directly
  startAdapter();
} // endElse
