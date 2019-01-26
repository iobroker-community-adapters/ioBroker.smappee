![Logo](admin/smappee.png)
# ioBroker.smappee

[![NPM version](http://img.shields.io/npm/v/iobroker.smappee.svg)](https://www.npmjs.com/package/iobroker.smappee)
[![Downloads](https://img.shields.io/npm/dm/iobroker.smappee.svg)](https://www.npmjs.com/package/iobroker.smappee)

[![NPM](https://nodei.co/npm/iobroker.smappee.png?downloads=true)](https://nodei.co/npm/iobroker.smappee/)

An ioBroker adapter for smappee - devices

#### You need to install first ioBroker.MQTT adapter (or use another MQTT-broker) and activate your Smappee's MQTT publishing. Please see the following instructions bevore installing the Smappee adapter.

This adapter brings you realtime (1s-interval) energy  power data, aggregated data for energy and optional sensor consumption data and access to your switches/plugs of your Smappee - Device to ioBroker.

## Instructions
###Installing ioBroker.mqtt - Adapter.
Please add an instance of the ioBroker.mqtt - Adapter:

![ioBMQ](https://github.com/forelleblau/ioBroker.smappee/blob/master/admin/ioBrokerMQTTBroker.PNG)

configure the instance as server/broker. Port 1883 as default is ok, feel free to choose any other working.
Set username and password (you will need this for smappee- and smappee-Adapter configuration.

![ioBMQ](https://github.com/forelleblau/ioBroker.smappee/blob/master/admin/ioBrokerMQTTConfig.PNG)



## Changelog

### 0.0.1 Development version

- in development


## License
The MIT License (MIT)

Copyright (c) 2018 forelleblau marceladam@gmx.ch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
