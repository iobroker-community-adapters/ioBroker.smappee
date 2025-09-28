# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

### Smappee Adapter Specific Context

This adapter connects ioBroker to Smappee energy monitoring devices. Smappee devices monitor energy consumption and production in homes and businesses, providing real-time data on power usage, water consumption, and smart switch controls. The adapter communicates with Smappee devices via MQTT protocol.

**Key Characteristics:**
- **Primary Function**: Monitor energy consumption, production, water usage, and control smart switches via Smappee devices
- **Communication Protocol**: MQTT (Message Queuing Telemetry Transport)
- **Device Types**: Smappee energy monitors, smart plugs/switches, water flow sensors
- **Data Types**: Power consumption/production (W), energy totals (kWh), current (A), voltage (V), water flow rates
- **Real-time Operations**: Continuous monitoring with 5-minute aggregation intervals
- **Control Capabilities**: Smart switch on/off control, energy export monitoring

**Configuration Requirements:**
- MQTT broker connection (host, port, username, password)
- Device discovery and management through MQTT topics
- State management for multiple sensors and switches per device

**Common Data Patterns:**
- Energy readings with timestamp aggregation
- Power state tracking for switches
- Counter values for cumulative consumption
- Connection status monitoring

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Create tests for all adapter main functions and helper methods
- Test error handling scenarios and edge cases
- Mock external API calls and hardware dependencies
- For adapters connecting to APIs/devices not reachable by internet, provide example data files to allow testing of functionality without live connections
- Example test structure:
  ```javascript
  describe('AdapterName', () => {
    let adapter;
    
    beforeEach(() => {
      // Setup test adapter instance
    });
    
    test('should initialize correctly', () => {
      // Test adapter initialization
    });
  });
  ```

### Integration Testing

**IMPORTANT**: Use the official `@iobroker/testing` framework for all integration tests. This is the ONLY correct way to test ioBroker adapters.

**Official Documentation**: https://github.com/ioBroker/testing

#### Framework Structure
Integration tests MUST follow this exact pattern:

```javascript
const path = require('path');
const { tests } = require('@iobroker/testing');

// Define test coordinates or configuration
const TEST_COORDINATES = '52.520008,13.404954'; // Berlin
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Use tests.integration() with defineAdditionalTests
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Test adapter with specific configuration', (getHarness) => {
            let harness;

            before(() => {
                harness = getHarness();
            });

            it('should configure and start adapter', function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        harness = getHarness();

                        // Change the configuration - example for weather adapter
                        await harness.changeAdapterConfig('weather', {
                            common: {},
                            native: {
                                location: TEST_COORDINATES,
                                apikey: 'fake-key-for-testing'
                            }
                        });

                        // Start the adapter and wait for completion
                        await harness.startAdapterAndWait();
                        
                        // Test your adapter functionality here
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        });
    }
});
```

**Critical Framework Rules:**
1. **Always use `tests.integration()`** - never create your own test framework
2. **Use `defineAdditionalTests`** for custom test scenarios
3. **Use `getHarness()`** to access the test harness
4. **Call `harness.changeAdapterConfig()`** to modify configuration before starting
5. **Use `harness.startAdapterAndWait()`** to start the adapter properly
6. **Place integration tests in `test/integration.js`**

#### Testing MQTT Adapters Like Smappee

For MQTT-based adapters, integration tests should:

```javascript
// Mock MQTT data for testing
const mockSmappeeData = {
    power: 1500,
    voltage: 230,
    current: 6.5,
    energy: 25.4,
    timestamp: Date.now()
};

suite('Smappee MQTT Integration', (getHarness) => {
    it('should process MQTT messages correctly', async function () {
        harness = getHarness();
        
        await harness.changeAdapterConfig('smappee', {
            native: {
                mqtthost: 'localhost',
                mqttport: 1883,
                mqttusername: 'test',
                mqttpassword: 'test'
            }
        });
        
        // Mock MQTT client behavior
        // Test message processing
        // Verify state creation and updates
    });
});
```

#### Package Testing
- Use the standard ioBroker package tests: `npm run test:package`
- These tests validate adapter configuration and basic structure

## Logging

Use the adapter's built-in logging methods with appropriate levels:

```javascript
// Error level - for errors that prevent adapter functionality
this.log.error('MQTT connection failed: ' + error.message);

// Warning level - for recoverable issues
this.log.warn('Device not responding, retrying connection');

// Info level - for important operational information
this.log.info('Successfully connected to MQTT broker');

// Debug level - for detailed troubleshooting information
this.log.debug('Received MQTT message on topic: ' + topic);
```

### Smappee-Specific Logging Patterns

```javascript
// Connection status logging
this.log.info('MQTT broker connection established');
this.log.warn('MQTT connection lost, attempting reconnect...');

// Device data logging
this.log.debug(`Smappee data received: Power=${power}W, Energy=${energy}kWh`);

// Switch control logging
this.log.info(`Smart switch ${deviceId} turned ${state ? 'ON' : 'OFF'}`);

// Error handling
this.log.error('Failed to parse Smappee MQTT message: ' + error.message);
```

## Error Handling

### General Patterns
```javascript
// Wrap async operations in try-catch blocks
try {
    await this.someAsyncOperation();
} catch (error) {
    this.log.error('Operation failed: ' + error.message);
    // Handle graceful degradation
}

// Handle adapter shutdown gracefully
async unload(callback) {
    try {
        // Clean up resources
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        callback();
    } catch (error) {
        this.log.error('Error during unload: ' + error.message);
        callback();
    }
}
```

### MQTT Connection Error Handling

```javascript
// Connection error handling with retry logic
this.mqttClient.on('error', (error) => {
    this.log.error('MQTT connection error: ' + error.message);
    this.setState('info.connection', false, true);
    
    // Implement reconnection logic
    setTimeout(() => {
        this.connectToMqtt();
    }, 5000);
});

// Graceful disconnect
this.mqttClient.on('close', () => {
    this.log.info('MQTT connection closed');
    this.setState('info.connection', false, true);
});
```

## State Management

### State Creation and Updates
```javascript
// Create states with proper structure
await this.setObjectNotExistsAsync('device.power', {
    type: 'state',
    common: {
        name: 'Current Power',
        type: 'number',
        role: 'value.power',
        unit: 'W',
        read: true,
        write: false
    },
    native: {}
});

// Update states with proper acknowledge flag
this.setState('device.power', currentPower, true);
```

### Smappee State Patterns

```javascript
// Energy monitoring states
await this.setObjectNotExistsAsync('energy.consumption', {
    type: 'state',
    common: {
        name: 'Energy Consumption',
        type: 'number',
        role: 'value.power.consumption',
        unit: 'kWh',
        read: true,
        write: false
    }
});

// Smart switch control states
await this.setObjectNotExistsAsync('switches.plug1.power', {
    type: 'state',
    common: {
        name: 'Smart Plug Power',
        type: 'boolean',
        role: 'switch.power',
        read: true,
        write: true
    }
});

// Connection status
await this.setObjectNotExistsAsync('info.connection', {
    type: 'state',
    common: {
        name: 'Connected to Smappee',
        type: 'boolean',
        role: 'indicator.connected',
        read: true,
        write: false
    }
});
```

## Adapter Configuration

### Configuration Schema (io-package.json)
```json
{
  "native": {
    "mqtthost": "localhost",
    "mqttport": 1883,
    "mqttusername": "",
    "mqttpassword": ""
  }
}
```

### Accessing Configuration
```javascript
// Access native configuration
const mqttHost = this.config.mqtthost || 'localhost';
const mqttPort = this.config.mqttport || 1883;

// Validate configuration
if (!mqttHost) {
    this.log.error('MQTT host not configured');
    return;
}
```

## Code Organization

### File Structure
```
/
├── main.js                 // Main adapter file
├── lib/                   // Helper modules
│   ├── smappee.js        // Smappee-specific logic
│   └── mqtt-handler.js   // MQTT connection management
├── admin/                // Admin interface files
├── test/                 // Test files
└── io-package.json       // Adapter configuration
```

### Modular Design
```javascript
// lib/smappee.js - Smappee device logic
class SmappeeDevice {
    constructor(adapter) {
        this.adapter = adapter;
    }
    
    processEnergyData(data) {
        // Process energy monitoring data
    }
    
    controlSwitch(deviceId, state) {
        // Control smart switch
    }
}

// lib/mqtt-handler.js - MQTT communication
class MqttHandler {
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = config;
    }
    
    connect() {
        // Establish MQTT connection
    }
    
    subscribe(topics) {
        // Subscribe to MQTT topics
    }
}
```

## Adapter Lifecycle

### Initialization
```javascript
class SmappeeAdapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'smappee',
        });
        
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    
    async onReady() {
        // Initialize adapter
        await this.initializeStates();
        await this.connectToSmappee();
    }
}
```

### State Change Handling
```javascript
async onStateChange(id, state) {
    if (state && !state.ack) {
        // Handle state changes from ioBroker
        if (id.includes('.switches.') && id.endsWith('.power')) {
            await this.controlSmartSwitch(id, state.val);
        }
    }
}
```

### Cleanup
```javascript
async onUnload(callback) {
    try {
        // Disconnect from MQTT
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        
        // Clear intervals/timeouts
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        callback();
    } catch (error) {
        this.log.error('Error during cleanup: ' + error.message);
        callback();
    }
}
```

## Performance Optimization

### Efficient Data Processing
```javascript
// Batch state updates
const stateUpdates = [];
for (const [key, value] of Object.entries(deviceData)) {
    stateUpdates.push({
        id: `device.${key}`,
        val: value,
        ack: true
    });
}

// Apply all updates
await this.setStatesAsync(stateUpdates);
```

### Memory Management
```javascript
// Avoid memory leaks in event handlers
process.on('SIGINT', () => {
    this.terminate();
});

process.on('SIGTERM', () => {
    this.terminate();
});
```

## Security Considerations

### Secure Configuration
```javascript
// Never log sensitive data
this.log.debug('Connecting to MQTT broker at ' + this.config.mqtthost + ':' + this.config.mqttport);
// DON'T log: this.log.debug('Using password: ' + this.config.mqttpassword);

// Validate input data
function validateMqttMessage(message) {
    if (typeof message !== 'object' || message === null) {
        throw new Error('Invalid MQTT message format');
    }
    return true;
}
```

## Documentation

### Code Comments
```javascript
/**
 * Processes energy data from Smappee device
 * @param {Object} data - Raw energy data from MQTT
 * @param {number} data.power - Current power consumption in Watts
 * @param {number} data.voltage - Voltage in Volts
 * @param {number} data.current - Current in Amperes
 * @returns {Promise<void>}
 */
async processEnergyData(data) {
    // Implementation
}
```

### README Documentation
- Include clear setup instructions
- Document MQTT topic structure
- Provide configuration examples
- List supported Smappee device models

## Dependencies

### Core Dependencies
```json
{
  "@iobroker/adapter-core": "^3.x.x",
  "mqtt": "^5.x.x"
}
```

### Development Dependencies
```json
{
  "@iobroker/testing": "^5.x.x",
  "eslint": "^8.x.x",
  "mocha": "^10.x.x"
}
```

## Common Patterns for Smappee Integration

### MQTT Topic Handling
```javascript
// Subscribe to Smappee device topics
const topics = [
    'smappee/+/realtime',
    'smappee/+/switches/+/state',
    'smappee/+/sensors/+/data'
];

this.mqttClient.subscribe(topics, (error) => {
    if (error) {
        this.log.error('MQTT subscription failed: ' + error.message);
    }
});

// Parse MQTT topics for device identification
this.mqttClient.on('message', (topic, message) => {
    const topicParts = topic.split('/');
    const deviceId = topicParts[1];
    const dataType = topicParts[2];
    
    this.processSmappeeMessage(deviceId, dataType, JSON.parse(message.toString()));
});
```

### Data Validation and Processing
```javascript
function validateSmappeeData(data) {
    const requiredFields = ['timestamp', 'power'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
    
    // Validate data types
    if (typeof data.power !== 'number' || data.power < 0) {
        throw new Error('Invalid power value');
    }
    
    return true;
}
```

### Switch Control Implementation
```javascript
async controlSmartSwitch(deviceId, state) {
    try {
        const topic = `smappee/${deviceId}/switches/control`;
        const message = JSON.stringify({
            command: state ? 'ON' : 'OFF',
            timestamp: Date.now()
        });
        
        this.mqttClient.publish(topic, message, { qos: 1 }, (error) => {
            if (error) {
                this.log.error(`Failed to control switch ${deviceId}: ${error.message}`);
            } else {
                this.log.info(`Switch ${deviceId} turned ${state ? 'ON' : 'OFF'}`);
            }
        });
    } catch (error) {
        this.log.error('Switch control error: ' + error.message);
    }
}
```

## Troubleshooting Guidelines

### Common Issues and Solutions

1. **MQTT Connection Issues**
   - Verify broker host and port
   - Check authentication credentials
   - Ensure network connectivity
   - Monitor connection state

2. **Data Processing Errors**
   - Validate MQTT message format
   - Check data type conversions
   - Handle missing or invalid fields
   - Implement retry logic

3. **State Update Problems**
   - Verify object structure
   - Check state permissions (read/write)
   - Ensure proper acknowledge flags
   - Monitor state change events

### Debugging Techniques
```javascript
// Enable detailed MQTT logging
if (this.log.level === 'debug') {
    this.mqttClient.on('message', (topic, message) => {
        this.log.debug(`MQTT: ${topic} = ${message.toString()}`);
    });
}

// Performance monitoring
const startTime = Date.now();
await this.processLargeDataSet();
this.log.debug(`Processing completed in ${Date.now() - startTime}ms`);
```

---

**Note:** This template is maintained centrally at https://github.com/DrozmotiX/ioBroker-Copilot-Instructions. Version updates are managed automatically through GitHub Actions.