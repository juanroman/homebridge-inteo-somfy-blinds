# homebridge-inteo-somfy-blinds

[![npm version](https://img.shields.io/npm/v/homebridge-inteo-somfy-blinds.svg)](https://www.npmjs.com/package/homebridge-inteo-somfy-blinds)
[![CI](https://github.com/juanroman/homebridge-inteo-somfy-blinds/actions/workflows/ci.yml/badge.svg)](https://github.com/juanroman/homebridge-inteo-somfy-blinds/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Homebridge plugin for **Somfy RTS blinds controlled via Inteo/Neocontrol hub**. Exposes your blinds as proper HomeKit Window Covering accessories.

> **Important:** This plugin is specifically designed for the **Somfy RTS + Inteo/Neocontrol hub** combination, which is a popular smart home setup in Mexico and Latin America. If you have a different Somfy system (TaHoma, Connexoon, myLink, etc.), this plugin will not work for you.

## Important Limitations

> **This plugin supports binary control only: fully open or fully closed.**
>
> Somfy RTS motors have no position feedback, so partial positions (like 50%) cannot be supported accurately.

| Command | Result |
|---------|--------|
| "Hey Siri, open the blinds" | ✅ Works perfectly |
| "Hey Siri, close the blinds" | ✅ Works perfectly |
| "Hey Siri, set blinds to 50%" | ⚠️ Does nothing |
| "Hey Siri, set blinds to 70%" | ⚠️ Will fully OPEN |

## Installation

### Via Homebridge UI (Recommended)

1. Search for `homebridge-inteo-somfy-blinds` in the Homebridge UI plugin search
2. Click **Install**
3. Configure the plugin in the UI

### Via npm

```bash
npm install -g homebridge-inteo-somfy-blinds
```

## Configuration

### Finding Your Scene Numbers

**Scene numbers are assigned based on the order you created them in the Inteo app, NOT the alphabetical display order.**

To find your scene numbers:

1. **If you remember the creation order**: First scene created = 0, second = 1, etc.
2. **Trial and error**: Test scene numbers starting from 0 until you find the right one
3. **Network inspection**: Use browser dev tools or a proxy to capture requests from the Inteo app

### Example Configuration

```json
{
  "platforms": [
    {
      "platform": "InteoSomfyBlinds",
      "name": "Somfy Blinds",
      "hubMac": "AA:BB:CC:DD:EE:FF",
      "blinds": [
        {
          "name": "Living Room",
          "openScene": 1,
          "closeScene": 0
        },
        {
          "name": "Bedroom",
          "openScene": 3,
          "closeScene": 2
        },
        {
          "name": "Kitchen",
          "openScene": 5,
          "closeScene": 4
        }
      ]
    }
  ]
}
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | - | Must be `InteoSomfyBlinds` |
| `name` | No | `Somfy Blinds` | Platform display name in logs |
| `hubMac` | Yes | - | Your Neocontrol hub's MAC address |
| `baseUrl` | No | `http://iOS.neocontrolglobal.com:9151` | Neocontrol API URL |
| `blinds` | Yes | - | Array of blind configurations |

#### Blind Configuration

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Display name in HomeKit |
| `openScene` | Yes | Scene number to open this blind |
| `closeScene` | Yes | Scene number to close this blind |

#### Advanced Options

| Option | Default | Description |
|--------|---------|-------------|
| `advanced.retryAttempts` | `3` | Number of retry attempts on failure |
| `advanced.requestTimeout` | `5000` | HTTP timeout in milliseconds |

## How It Works

### Position States

| Position | Meaning |
|----------|---------|
| 0% | Closed (successfully commanded) |
| 50% | Unknown (startup, error, or uncertain state) |
| 100% | Open (successfully commanded) |

### State Behavior

- **On startup**: All blinds show 50% (unknown) because we can't query actual position
- **After successful command**: Position updates to 0% or 100%
- **On error**: Position reverts to 50% (unknown) since we can't verify if command executed

### Idempotent Commands

Commands are safe to repeat. Sending "open" to an already-open blind is harmless - the motor will ignore it.

## Troubleshooting

### Blind shows "No Response"

1. Check your internet connection (this plugin uses Neocontrol's cloud API)
2. Verify your hub MAC address is correct
3. Check Homebridge logs for error messages
4. Try increasing `requestTimeout` in advanced settings

### Commands don't work

1. Verify scene numbers are correct (remember: 0-indexed by creation order)
2. Test the scenes manually in the Inteo app
3. Check if Neocontrol cloud service is operational

### Blind shows 50% after command

This means the command failed. Check:
- Network connectivity
- Scene number accuracy
- Homebridge logs for specific errors

## What Makes This Plugin Unique?

This plugin is designed for a specific hardware combination that is **not supported by other Homebridge plugins**:

- **Hardware:** Somfy RTS motors + Inteo/Neocontrol hub
- **API:** Uses Neocontrol's cloud API
- **Control Method:** Scene-based control (each blind operation is a scene in the Inteo app)
- **Region:** Popular setup in Mexico and Latin America

**This is NOT for:**

- Somfy TaHoma hubs (use homebridge-tahoma)
- Somfy Connexoon hubs (use homebridge-connexoon)
- Somfy myLink bridges (use homebridge-mylink)
- Direct Somfy RTS control without a hub

## Requirements

- Node.js 20.15.1+, 22+, or 24+
- Homebridge 1.8.0+ or 2.0.0+
- Neocontrol/Inteo hub with cloud connectivity
- Scenes configured in the Inteo app

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## Integration Testing

For testing with real hardware, see [docs/UBUNTU_TESTING.md](docs/UBUNTU_TESTING.md) for a comprehensive guide on setting up a test environment using Ubuntu on Parallels (or any Linux VM/machine).

**Why Linux?** HomeKit uses mDNS/Bonjour for discovery, which works perfectly on Linux with proper network configuration. This provides a safe, isolated test environment separate from your production Homebridge.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Thanks to the Homebridge team for the excellent plugin development framework
- Inspired by the need to properly integrate Somfy RTS blinds into HomeKit
