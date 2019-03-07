/**
 * smappee adapter
 */

/* jshint -W097 */ // jshint strict:false
/*jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
let adapter;
var port;
var host;
var client;
var username;
var password;
var tested;
var mqtt = require('mqtt');
var servloc;
var configtopics = [];
var inputchannels = [];
var gwSensorChannelsConfigArr = [];
var gwCounterState;

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
      callback();
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

    try {
      adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
      if (id.slice(-4) == "5min") {
        id = id.substring(adapter.namespace.length + 1);
        state = state.val;
        countercount(id, state);
      }


      if (!id || state.ack) return; // Ignore acknowledged state changes or error states
      id = id.substring(adapter.namespace.length + 1); // remove instance name and id
      state = state.val;
      adapter.log.debug("id=" + id);
      var idarray = id.split('.');
      adapter.log.debug("idarray: " + idarray);
      if (idarray[4] == "switchON") {
        var topicout = 'servicelocation/' + idarray[1] + '/' + idarray[2] + '/' + idarray[3] + "/setstate";
        if (state == true) {
          var payload = '{"value":"ON", "since":' + new Date().getTime() + '}';
          adapter.setState('Servicelocations.' + idarray[1] + '.plug.' + idarray[3] + ".switchON", true, true);
        } else {
          var payload = '{"value":"OFF", "since":' + new Date().getTime() + '}';
          adapter.setState('Servicelocations.' + idarray[1] + '.plug.' + idarray[3] + ".switchON", false, true);

        }
        adapter.log.debug("Topic: " + topicout + "Message: " + payload);
        client.publish(topicout, payload);
      }

      // you can use the ack flag to detect if it is status (true) or command (false)
      if (state && !state.ack) {
        adapter.log.info('ack is not set!');
      }
    } catch (e) {
      adapter.log.debug("Fehler Befehlsauswertung: " + e);
    }
  });

  // you can use the ack flag to detect if it is status (true) or command (false)



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
    main();
    adapter.subscribeStates('*');
  });

  return adapter;
} // endStartAdapter


function main() {

  host = adapter.config.mqtthost;
  port = adapter.config.mqttport;
  username = adapter.config.mqttusername;
  password = adapter.config.mqttpassword;
  try {
    client = mqtt.connect({
      host: host,
      port: port,
      username: username,
      password: password,
    });

    client.on('connect', function() {
      adapter.setState('info.connection', true, true);
      adapter.log.info("MQTT connected");
      client.subscribe('servicelocation/#');

      client.on('message', function(topic, message) {
        try {
          var messageJ = JSON.parse(message);
          var topicarray = topic.split("/");
          adapter.log.debug("Topic: " + topicarray[2]);
          if (configtopics.indexOf(topicarray[2]) != -1) {
            getsmappeedata(topicarray, messageJ);
          } else {
            getsmappeeconfig(topicarray, messageJ);
          }

        } catch (e) {
          adapter.log.warn("MAIN: JSON-parse-Fehler Message: " + e.message);
        }
      });
    });
  } catch (e) {
    adapter.log.warn("Main connect error: " + e);
  }
} //endMain

function getsmappeeconfig(topicarray, messageJ) {
  adapter.log.debug("Lege Objekte an");
  try {
    switch (topicarray[2]) {
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
        adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power', {
          type: 'channel',
          role: '',
          common: {
            name: "power"
          },
          native: {}
        });


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
        adapter.log.debug("Alle config - Objekte definiert");
        configtopics.push("config");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "realtime":
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
        adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.alwaysOn', {
          type: 'state',
          common: {
            name: 'alwaysOn',
            desc: 'PAC always on',
            type: 'number',
            role: "value.alwaysOn",
            read: true,
            write: false,
            unit: "W"
          },
          native: {}
        });
        if (messageJ.totalImportEnergy != 0) {
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
        if (messageJ.totalExportEnergy != 0) {
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
        for (var cleng = 0; cleng < messageJ.channelPowers.length; cleng++) {
          if (messageJ.channelPowers[cleng].exportEnergy != 0) {
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[cleng].ctInput + ".phaseExportEnergy", {
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
          }
          if (messageJ.channelPowers[cleng].importEnergy != 0) {
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[cleng].ctInput + ".phaseImportEnergy", {
              type: 'state',
              common: {
                name: 'Phase consumption',
                desc: 'Energy consumption on Phase',
                type: 'number',
                role: "value.production",
                read: true,
                write: false,
                unit: "kWh"
              },
              native: {}
            });
            adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[cleng].ctInput + ".phasePower", {
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
          }
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[cleng].ctInput + ".phaseId", {
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
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[cleng].ctInput + ".phasePower", {
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
        }
        configtopics.push("realtime");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "channelConfig":
        for (var ileng = 0; ileng < messageJ.inputChannels.length; ileng++) {
          adapter.log.debug("Anzahl Channels: " + messageJ.inputChannels.length);
          if (messageJ.inputChannels[ileng].inputChannelType != "UNUSED") {
            adapter.log.debug("CT-Input " + messageJ.inputChannels[ileng].ctInput + " USED");
            if (inputchannels.indexOf("CT_" + ileng + "_used") < 0) {
              inputchannels.push("CT_" + ileng + "_used");
              adapter.log.debug("Anzahlt Input-Channels: " + inputchannels.length)
            }
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
          }
        }
        configtopics.push("channelConfig");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "sensorConfig":
        for (var i = 0; i < messageJ.gwSensors.length; i++) {
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".SerialNumber", {
            type: 'state',
            common: {
              name: 'gwSerial',
              desc: 'GW_Sensor serial Number',
              type: 'string',
              role: "info.gwSerial",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".temperature", {
            type: 'state',
            common: {
              name: 'gwTemp',
              desc: 'GW_Sensor Temperature',
              type: 'number',
              role: "value.gwTemp",
              read: true,
              write: false,
              unit: "°C"
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".humidity", {
            type: 'state',
            common: {
              name: 'gwHUM',
              desc: 'GW_Sensor Humidity',
              type: 'number',
              role: "value.gwHUM",
              read: true,
              write: false,
              unit: "%"
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".battLevel", {
            type: 'state',
            common: {
              name: 'gwBattL',
              desc: 'GW_Sensor Battery Level',
              type: 'number',
              role: "value.gwBattL",
              read: true,
              write: false,
              unit: "%"
            },
            native: {}
          });
          for (var y = 0; y < 2; y++) {
            if (messageJ.gwSensors[i].gwSensorChannelsConfig[y].enabled == true) {
              adapter.log.debug("Zählerstatus" + i + y + messageJ.gwSensors[i].gwSensorChannelsConfig[y].enabled);
              adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".Channel_" + y + ".type", {
                type: 'state',
                common: {
                  name: 'gwType',
                  desc: 'GW_Sensor channel type',
                  type: 'string',
                  role: "info.gwType",
                  read: true,
                  write: false
                },
                native: {}
              });
              adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".Channel_" + y + ".consumption5min", {
                type: 'state',
                common: {
                  name: 'gwConsumption5min',
                  desc: 'GW_Sensor channel consumption last 5 min',
                  type: 'number',
                  role: "value.consumption",
                  read: true,
                  write: false,
                  unit: messageJ.gwSensors[i].gwSensorChannelsConfig[y].uom
                },
                native: {}
              });
              adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".Channel_" + y + ".consumptionTotal", {
                type: 'state',
                common: {
                  name: 'gwConsumptionTotal',
                  desc: 'GW_Sensor channel consumption total',
                  type: 'number',
                  def: 1,
                  role: "value.consumption",
                  read: true,
                  write: true,
                  unit: messageJ.gwSensors[i].gwSensorChannelsConfig[y].uom
                },
                native: {}
              });
            }
          }
          gwSensorChannelsConfigArr[messageJ.gwSensors[i].sensorId] = JSON.stringify(messageJ.gwSensors[i].gwSensorChannelsConfig);
        }

        for (var i = 0; i < messageJ.switchSensors.length; i++) {
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchSensors[i].sensorId + ".name", {
            type: 'state',
            common: {
              name: 'Name',
              desc: 'Switch Sensors name',
              type: 'string',
              role: "info.name",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchSensors[i].sensorId + ".SerialNumber", {
            type: 'state',
            common: {
              name: 'SerialNumber',
              desc: 'Switch Sensors serial number',
              type: 'string',
              role: "info.sn",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchSensors[i].sensorId + ".consumption5min", {
            type: 'state',
            common: {
              name: 'Consumption active power 5min',
              desc: 'Switch Sensors energy consumption last 5-min value',
              type: 'number',
              role: "info.consumption",
              read: true,
              write: false,
              unit: "Wh"
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchSensors[i].sensorId + ".consumptionTotal", {
            type: 'state',
            common: {
              name: 'Consumption active power total',
              desc: 'Switch Sensors energy consumption total',
              type: 'number',
              def: 1,
              role: "info.consumption",
              read: true,
              write: true,
              unit: "Wh"
            },
            native: {}
          });
        }

        configtopics.push("sensorConfig");

        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);


        break;

      case "homeControlConfig":
        for (var i = 0; i < messageJ.smartplugActuators.length; i++) {
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.smartplugActuators[i].nodeId + ".state", {
            type: 'state',
            common: {
              name: 'reported state',
              desc: 'State smart plug',
              type: 'string',
              role: "info.state",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.smartplugActuators[i].nodeId + ".statesince", {
            type: 'state',
            common: {
              name: 'state since',
              desc: 'State smart plug swiched state since',
              type: 'string',
              role: "info.state",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.smartplugActuators[i].nodeId + ".name", {
            type: 'state',
            common: {
              name: 'plugs name',
              desc: 'Name of smart plug',
              type: 'string',
              role: "info.name",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.smartplugActuators[i].nodeId + ".switchON", {
            type: 'state',
            common: {
              name: 'control with ON_true OFF_false',
              desc: 'control state of  smart plug',
              type: 'boolean',
              role: "control.state",
              read: true,
              write: true
            },
            native: {}
          });
        }
        for (var i = 0; i < messageJ.switchActuators.length; i++) {
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".state", {
            type: 'state',
            common: {
              name: 'reported state',
              desc: 'State smart plug',
              type: 'string',
              role: "info.state",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".statesince", {
            type: 'state',
            common: {
              name: 'state since',
              desc: 'Smartswitch state swiched since',
              type: 'string',
              role: "info.state",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".connstate", {
            type: 'state',
            common: {
              name: 'reported connection state',
              desc: 'Connection state of smart plug',
              type: 'string',
              role: "info.state",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".connstatesince", {
            type: 'state',
            common: {
              name: 'connection state since',
              desc: 'connection state switch plug since',
              type: 'string',
              role: "info.state",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".name", {
            type: 'state',
            common: {
              name: 'plugs name',
              desc: 'Name of smart plug',
              type: 'string',
              role: "info.name",
              read: true,
              write: false
            },
            native: {}
          });
          adapter.setObjectNotExists('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".switchON", {
            type: 'state',
            common: {
              name: 'control with ON_true OFF_false',
              desc: 'control state of  smart plug',
              type: 'boolean',
              role: "control.state",
              read: true,
              write: true
            },
            native: {}
          });
        }
        for (var i = 0; i < messageJ.smartplugActuators.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.smartplugActuators[i].nodeId + ".name", messageJ.smartplugActuators[i].name, true);
        }
        for (var i = 0; i < messageJ.switchActuators.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.plug.' + messageJ.switchActuators[i].nodeId + ".name", messageJ.switchActuators[i].name, true);
        }
        adapter.log.debug("Alle homeControlConfig - Objekte definiert");
        adapter.log.debug(messageJ.smartplugActuators.length + " Smartplugs angelegt, " + messageJ.switchActuators.length + " Smartswitches angelegt.");
        configtopics.push("homeControlConfig");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "aggregated":
        configtopics.push("aggregated");
        adapter.log.debug("Topic aggregated to be developed");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "aggregatedGW":
        configtopics.push("aggregatedGW");
        adapter.log.debug("Topic aggregatedGW - no config input");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "aggregatedSwitch":
        configtopics.push("aggregatedSwitch");
        adapter.log.debug("Topic aggregatedSwitch  - no config input");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "presence":
        configtopics.push("presence");
        adapter.log.debug("Topic presence to be developed");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "scheduler":
        configtopics.push("scheduler");
        adapter.log.debug("Topic scheduler to be developed");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;

      case "plug":
        configtopics.push("plug");
        adapter.log.debug("Topic plug - no config input");
        adapter.log.debug("Anzahl Topics bearbeitet: " + configtopics.length);

        break;
    }

  } catch (e) {
    adapter.log.warn("smappeeconfig - JSON-parse-Fehler Message: " + e.message);
  };
} // end getsmappeeconfig


function getsmappeedata(topicarray, messageJ) {
  adapter.log.debug("Starte Datenimport");
  try {
    switch (topicarray[2]) {
      case "realtime":
        adapter.setState('Servicelocations.' + topicarray[1] + '.Power.totalPower', messageJ.totalPower, true);
        adapter.setState('Servicelocations.' + topicarray[1] + '.Power.voltage', messageJ.voltages[0].voltage, true);
        adapter.getObject('Servicelocations.' + topicarray[1] + '.Power.importEnergy', function(err, obj) {
          if (obj) {
            adapter.setState('Servicelocations.' + topicarray[1] + '.Power.importEnergy', (messageJ.totalImportEnergy / 3600000).toFixed(3), true);
            for (var i = 0; i < inputchannels.length; i++) {
              adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].ctInput + ".phaseImportEnergy", (messageJ.channelPowers[i].importEnergy / 3600000).toFixed(3), true);
            }
          } else {
            adapter.log.debug("No Import Energy");
          }
        });
        adapter.getObject('Servicelocations.' + topicarray[1] + '.Power.exportEnergy', function(err, obj) {
          if (obj) {
            adapter.setState('Servicelocations.' + topicarray[1] + '.Power.ExportEnergy', (messageJ.totalExportEnergy / 3600000).toFixed(3), true);
            for (var i = 0; i < inputchannels.length; i++) {
              adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].ctInput + ".phaseExportEnergy", (messageJ.channelPowers[i].exportEnergy / 3600000).toFixed(3), true);
            }
          } else {
            adapter.log.debug("No Export Energy");
          }
        });
        for (var i = 0; i < inputchannels.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].ctInput + ".phasePower", messageJ.channelPowers[i].power, true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.channelPowers[i].ctInput + ".phaseId", messageJ.channelPowers[i].phaseId, true);
        }
        break;

      case "config":
        adapter.setState('Servicelocations.' + topicarray[1] + '.Info.DeviceUUID', messageJ.deviceUuid, true);
        adapter.setState('Servicelocations.' + topicarray[1] + '.Info.serialNumber', messageJ.serialNumber, true);
        adapter.setState('Servicelocations.' + topicarray[1] + '.Info.ServLocUUID', messageJ.serviceLocationUuid, true);
        adapter.setState('Servicelocations.' + topicarray[1] + '.Info.ServLocID', messageJ.serviceLocationId, true);
        adapter.setState('Servicelocations.' + topicarray[1] + '.Info.firmwareV', messageJ.firmwareVersion, true);
        adapter.setState('Servicelocations.' + topicarray[1] + '.Info.AggrPeriod', messageJ.aggregationPeriodSeconds, true);
        break;

      case "channelConfig":
        for (var i = 0; i < inputchannels.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[i].ctInput + ".name", messageJ.inputChannels[i].name, true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[i].ctInput + ".inputChannelType", messageJ.inputChannels[i].inputChannelType, true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.Power.CT_Input.' + messageJ.inputChannels[i].ctInput + ".inputChannelConnection", messageJ.inputChannels[i].inputChannelConnection, true);
        }
        break;

      case "sensorConfig":
        for (var i = 0; i < messageJ.gwSensors.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".SerialNumber", messageJ.gwSensors[i].serialNumber, true);
          for (var y = 0; y < 2; y++) {
            if (messageJ.gwSensors[i].gwSensorChannelsConfig[y].enabled == true) {
              adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwSensors[i].sensorId + ".Channel_" + y + ".type", messageJ.gwSensors[i].gwSensorChannelsConfig[y].type, true);
            }
          }
        }
        for (var i = 0; i < messageJ.switchSensors.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchSensors[i].sensorId + ".name", messageJ.switchSensors[i].name, true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchSensors[i].sensorId + ".SerialNumber", messageJ.switchSensors[i].serialNumber, true);
        }
        break;

      case "aggregatedGW":
        for (var aGWcount = 0; aGWcount < messageJ.gwIntervalDatas.length; aGWcount++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwIntervalDatas[aGWcount].sensorId + ".temperature", (messageJ.gwIntervalDatas[aGWcount].temperature) / 10, true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwIntervalDatas[aGWcount].sensorId + ".humidity", messageJ.gwIntervalDatas[aGWcount].humidity, true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwIntervalDatas[aGWcount].sensorId + ".battLevel", messageJ.gwIntervalDatas[aGWcount].battLevel, true);

          try {
            adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwIntervalDatas[aGWcount].sensorId + ".Channel_0.consumption5min", (messageJ.gwIntervalDatas[aGWcount].index0Delta) / (JSON.parse(gwSensorChannelsConfigArr[messageJ.gwIntervalDatas[aGWcount].sensorId])[0].ppu), true);
          } catch (e) {
            adapter.log.debug("SensorId: " + messageJ.gwIntervalDatas[aGWcount].sensorId + " : no Water Sensor or consumption5min - error: " + e);
          }

          try {
            adapter.setState('Servicelocations.' + topicarray[1] + '.Gas_Water_Sensors.' + messageJ.gwIntervalDatas[aGWcount].sensorId + ".Channel_1.consumption5min", (messageJ.gwIntervalDatas[aGWcount].index1Delta) / (JSON.parse(gwSensorChannelsConfigArr[messageJ.gwIntervalDatas[aGWcount].sensorId])[1].ppu), true);
          } catch (e) {
            adapter.log.debug("SensorId: " + messageJ.gwIntervalDatas[aGWcount].sensorId + " : no Gas Sensor or consumptionTotal - error: " + e);
          }
        }

        break;

      case "aggregated":
        adapter.setState('Servicelocations.' + topicarray[1] + '.Power.alwaysOn', (messageJ.intervalDatas[0].alwaysOn) / 1000, true);

        break;

      case "aggregatedSwitch":
        for (i = 0; i < messageJ.switchIntervalDatas.length; i++) {
          adapter.setState('Servicelocations.' + topicarray[1] + '.SwitchSensors.' + messageJ.switchIntervalDatas[i].sensorId + ".consumption5min", (messageJ.switchIntervalDatas[i].activePower / 3600).toFixed(2), true);
        }
        break;

      case "plug":
        if (topicarray[4] == "state") {
          var s = new Date(messageJ.since);
          adapter.setState('Servicelocations.' + topicarray[1] + '.plug.' + topicarray[3] + ".statesince", s.toLocaleString(), true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.plug.' + topicarray[3] + ".state", messageJ.value, true);
        } else if (topicarray[4] == "connectionState") {
          var s = new Date(messageJ.since);
          adapter.setState('Servicelocations.' + topicarray[1] + '.plug.' + topicarray[3] + ".connstatesince", s.toLocaleString(), true);
          adapter.setState('Servicelocations.' + topicarray[1] + '.plug.' + topicarray[3] + ".connstate", messageJ.value, true);
        }

        break;

    }


  } catch (e) {
    adapter.log.warn("getsmappeedata - JSON-parse-Fehler Message: " + e.message);
  };
} //end getsmappeedata

function countercount(id, addval) {
  try {
    var idarray = id.split('.');
    adapter.log.debug("idarray: " + idarray);
    var idarrayshort = idarray.slice(1, -1);
    var idarrayshortstring = "";
    for (var i = 0; i < idarrayshort.length; i++) {
      idarrayshortstring = idarrayshortstring + idarrayshort[i] + '.'
    };
    var idcounter = 'Servicelocations.' + idarrayshortstring + "consumptionTotal";
    adapter.log.debug("ID Counter: " + idcounter);
    adapter.getState(idcounter, function(err, state) {
      if (state) {
        adapter.log.debug("Zählerwert bisher: " + state.val);
        adapter.log.debug("Zählerwert dazu: " + addval);
        adapter.log.debug("Zählerwert neu: " + (addval + state.val));
        adapter.setState(idcounter, (addval + state.val), true);
      } else {
        adapter.log.warn("Zähler hat keinen Wert, setze Zähler auf 1");
        adapter.setState(idcounter, 1, true);
      }
    });
  } catch (e) {
    adapter.log.warn("Countercount - Fehler: " + e);
  }
} //end countercount

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
  module.exports = startAdapter;
} else {
  // or start the instance directly
  startAdapter();
} // endElse
