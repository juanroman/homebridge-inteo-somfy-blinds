# Testing with Ubuntu on Parallels

This guide walks you through testing the plugin with real hardware using Ubuntu running in Parallels on macOS.

## Why Ubuntu on Parallels?

Unlike Docker on macOS (which has networking limitations), Parallels Ubuntu with **bridged networking** gives your VM a real IP address on your local network. This means:

✅ Full mDNS/Bonjour support (HomeKit discovery works)
✅ Your iPhone/iPad can discover the Homebridge instance
✅ Complete isolation from your production Homebridge
✅ Safe testing with real hardware

## Prerequisites

- Ubuntu VM running in Parallels Desktop
- VSCode installed in Ubuntu (for development)
- Repository cloned in Ubuntu

## Step 1: Configure Parallels Networking

**IMPORTANT:** Set Ubuntu to use Bridged Network mode so it gets an IP on your local network.

1. Shut down your Ubuntu VM
2. In Parallels Desktop, select your Ubuntu VM
3. Go to **Configure** → **Hardware** → **Network**
4. Change **Source** from "Shared Network" to **Bridged Network → Default Adapter**
5. Start your Ubuntu VM

### Verify Network Configuration

```bash
# In Ubuntu terminal
ip addr show

# Look for an IP like 192.168.81.x (same subnet as your Mac)
# Example output:
# inet 192.168.81.100/24
```

Your Ubuntu should now have an IP like `192.168.81.100` (on the same network as your Mac at `192.168.81.90`).

## Step 2: Install Node.js 22

```bash
# Add NodeSource repository for Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

## Step 3: Install Homebridge

```bash
# Install Homebridge globally
sudo npm install -g --unsafe-perm homebridge

# Verify installation
homebridge --version
```

## Step 4: Build and Link the Plugin

Navigate to your project directory in Ubuntu:

```bash
cd /path/to/homebridge-inteo-somfy-blinds

# Install dependencies
npm install

# Build the plugin
npm run build

# Link the plugin globally
sudo npm link

# Verify the plugin is linked
npm list -g homebridge-inteo-somfy-blinds
```

## Step 5: Configure Homebridge

Create a Homebridge configuration directory:

```bash
mkdir -p ~/.homebridge
```

Create the configuration file:

```bash
nano ~/.homebridge/config.json
```

Paste this configuration (adjust if needed):

```json
{
  "bridge": {
    "name": "Homebridge Test",
    "username": "0E:3E:35:D7:B0:EA",
    "port": 51826,
    "pin": "031-45-154"
  },
  "accessories": [],
  "platforms": [
    {
      "platform": "InteoSomfyBlinds",
      "name": "Somfy Blinds",
      "hubMac": "44D5F2C103AC",
      "baseUrl": "http://iOS.neocontrolglobal.com:9151",
      "blinds": [
        {
          "name": "Cortina",
          "openScene": 1,
          "closeScene": 0
        },
        {
          "name": "Dark",
          "openScene": 3,
          "closeScene": 4
        },
        {
          "name": "Cocina",
          "openScene": 2,
          "closeScene": 5
        },
        {
          "name": "Sala Izquierda",
          "openScene": 6,
          "closeScene": 7
        },
        {
          "name": "Sala Derecha",
          "openScene": 8,
          "closeScene": 9
        }
      ],
      "advanced": {
        "retryAttempts": 3,
        "requestTimeout": 5000
      }
    }
  ]
}
```

Save and exit (Ctrl+O, Enter, Ctrl+X in nano).

## Step 6: Run Homebridge

Start Homebridge in the foreground to see logs:

```bash
homebridge
```

You should see output like:

```
[12/7/2025, 10:30:00 AM] Loaded plugin: homebridge-inteo-somfy-blinds@1.0.0
[12/7/2025, 10:30:00 AM] Registering platform 'homebridge-inteo-somfy-blinds.InteoSomfyBlinds'
[12/7/2025, 10:30:00 AM] ---
[12/7/2025, 10:30:00 AM] Loaded 0 cached accessories from cachedAccessories.
[12/7/2025, 10:30:00 AM] ---
[12/7/2025, 10:30:00 AM] Loading 1 platforms...
[12/7/2025, 10:30:00 AM] [Somfy Blinds] Initializing InteoSomfyBlinds platform...
[12/7/2025, 10:30:00 AM] [Somfy Blinds] Adding new accessory: Cortina
[12/7/2025, 10:30:00 AM] [Somfy Blinds] Adding new accessory: Dark
[12/7/2025, 10:30:00 AM] [Somfy Blinds] Adding new accessory: Cocina
[12/7/2025, 10:30:00 AM] [Somfy Blinds] Adding new accessory: Sala Izquierda
[12/7/2025, 10:30:00 AM] [Somfy Blinds] Adding new accessory: Sala Derecha

Setup Payload:
┌────────────────────────────────────────┐
│ Scan this code with your Home app on  │
│ your iOS device to pair with Homebridge│
│                                        │
│    ┌────────────────────────────┐     │
│    │ [QR CODE]                  │     │
│    └────────────────────────────┘     │
│                                        │
│ Or enter this code with your Home app │
│           031-45-154                   │
└────────────────────────────────────────┘

Homebridge v1.x.x is running on port 51826.
```

## Step 7: Pair with HomeKit

### On your iPhone/iPad:

1. Open the **Home** app
2. Tap **+** (top right)
3. Tap **Add Accessory**
4. You should see **Homebridge Test** appear automatically in the nearby accessories
5. Tap it and enter the PIN: **031-45-154**
6. Follow the setup wizard
7. All 5 window coverings should appear:
   - Cortina
   - Dark
   - Cocina
   - Sala Izquierda
   - Sala Derecha

If it doesn't appear automatically:
- Tap **More Options...**
- Look for **Homebridge Test** in the list
- Or tap **I Don't Have a Code or Cannot Scan** and enter the PIN manually

## Step 8: Test Your Blinds!

Try opening and closing each blind from the Home app. You should see:

1. Commands sent to your Somfy hub
2. Blinds actually moving
3. Status updates in the Homebridge logs

### Monitoring Logs

Watch the Homebridge logs for debugging:

```bash
# Homebridge is already running in foreground, so you'll see logs immediately
# Look for messages like:
# [Somfy Blinds] Setting Cortina to 100% (OPEN)
# [Somfy Blinds] Successfully triggered scene 1 for Cortina
```

## Development Workflow

### Making Changes

1. **Stop Homebridge** (Ctrl+C in the terminal where it's running)

2. **Edit code in VSCode** (in Ubuntu)

3. **Rebuild:**
   ```bash
   npm run build
   ```

4. **Restart Homebridge:**
   ```bash
   homebridge
   ```

5. **Test changes** in Home app

The plugin is linked, so changes are immediately available after rebuild.

### Running as a Service (Optional)

Once you're confident, you can run Homebridge as a background service:

```bash
# Install homebridge-config-ui-x for web interface
sudo npm install -g homebridge-config-ui-x

# Set up as a service
sudo hb-service install --user $USER

# Start the service
sudo hb-service start

# View logs
sudo hb-service logs

# Access web UI at http://[ubuntu-ip]:8581
```

## Troubleshooting

### Homebridge Not Discoverable

**Check network configuration:**
```bash
ip addr show
# Verify Ubuntu has an IP on 192.168.81.x

ping 192.168.81.90  # Ping your Mac
# Should work if networking is correct
```

**Check Avahi (mDNS) is running:**
```bash
sudo systemctl status avahi-daemon
# Should be active (running)

# If not running:
sudo systemctl start avahi-daemon
```

### Plugin Not Loading

**Verify plugin is linked:**
```bash
npm list -g homebridge-inteo-somfy-blinds
# Should show the plugin

ls -la $(npm root -g)/homebridge-inteo-somfy-blinds
# Should show files (not just a broken symlink)
```

**Rebuild and relink:**
```bash
cd /path/to/project
npm run build
sudo npm unlink
sudo npm link
```

### Blinds Not Responding

**Test API directly from Ubuntu:**
```bash
# Try opening Cortina (scene 1)
curl "http://iOS.neocontrolglobal.com:9151/mqtt/command/44D5F2C103AC/1"

# Should return HTTP 200
# Your blind should move
```

**Check Homebridge logs** for errors when you trigger a command in Home app.

### Can't Connect from macOS VSCode

If you're developing in macOS but running Homebridge in Ubuntu:

1. Use Remote SSH extension in VSCode (on macOS)
2. Connect to your Ubuntu VM
3. Or just use VSCode directly in Ubuntu

## Network Details

**Your setup:**
- Mac IP: `192.168.81.90`
- Ubuntu IP: `192.168.81.x` (check with `ip addr`)
- Production Homebridge (Mac): `192.168.81.90:51403`
- Test Homebridge (Ubuntu): `192.168.81.x:51826`

Both are on the same network, completely isolated, won't interfere with each other.

## Cleanup

### Temporary Cleanup (Keep Configuration)

```bash
# Stop Homebridge (Ctrl+C)
# Your configuration stays in ~/.homebridge
```

### Complete Cleanup

```bash
# Unlink plugin
cd /path/to/project
sudo npm unlink

# Remove Homebridge config
rm -rf ~/.homebridge

# Uninstall Homebridge (optional)
sudo npm uninstall -g homebridge
```

## Next Steps

Once you've successfully tested:

1. Document any issues found
2. Fix bugs if needed
3. When satisfied, publish to npm
4. Users can install with: `npm install -g homebridge-inteo-somfy-blinds`

## Summary

This setup gives you:
- ✅ Real hardware testing
- ✅ Complete isolation from production
- ✅ Full HomeKit integration
- ✅ Easy debugging with live logs
- ✅ Realistic user experience

Much better than Docker on macOS!
