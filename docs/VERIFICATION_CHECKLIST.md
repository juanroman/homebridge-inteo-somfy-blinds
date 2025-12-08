# Homebridge Plugin Verification Checklist

This document tracks compliance with [Homebridge Verified Plugin Requirements](https://github.com/homebridge/verified/blob/latest/verified-plugins.md).

**Last Updated:** 2025-12-08
**Requirements Version:** 2024-11-02

---

## Status Overview

- ✅ = Compliant
- ⚠️ = Needs Action
- ❌ = Not Compliant

---

## GENERAL

### ✅ Dynamic Platform Type

**Requirement:** The plugin must be of type dynamic platform.

**Status:** ✅ COMPLIANT

**Evidence:**
- `config.schema.json:3` - `"pluginType": "platform"`
- `src/platform.ts:23` - Implements `DynamicPlatformPlugin`
- Accessories are dynamically discovered and registered

---

### ✅ Unique Functionality

**Requirement:** The plugin must not offer the same nor less functionality than that of any existing verified plugin.

**Status:** ✅ COMPLIANT

**What Makes This Plugin Unique:**

This plugin serves a specific hardware combination **NOT supported by any other Homebridge plugin**:

- **Hardware:** Somfy RTS motors + Inteo/Neocontrol hub
- **API:** Neocontrol cloud API (`http://iOS.neocontrolglobal.com:9151`)
- **Control Method:** Scene-based control via Inteo app
- **Market:** Popular in Mexico and Latin America
- **Documentation:** README explicitly states this is NOT for TaHoma, Connexoon, myLink, or other Somfy systems

**Competing Plugins (Different Hardware):**

- `homebridge-tahoma` - For Somfy TaHoma hubs (different API)
- `homebridge-connexoon` - For Somfy Connexoon hubs (different API)
- `homebridge-mylink` - For Somfy myLink bridges (different API)

**Verification:**

- [x] Searched Homebridge Verified Plugins list - no Inteo/Neocontrol plugins exist
- [x] Documented unique value proposition in README
- [x] Clarified this is NOT a general Somfy plugin

---

## REPO

### ✅ NPM Publication & GitHub Repository

**Requirement:** The plugin must be published to NPM and the source code available on a GitHub repository, with issues enabled.

**Status:** ✅ COMPLIANT

**Evidence:**
- ✅ GitHub repo exists: `https://github.com/juanroman/homebridge-inteo-somfy-blinds`
- ✅ GitHub Issues are enabled
- ✅ Issues URL configured in package.json
- ✅ **Published to NPM** - Version 1.0.0 live on registry
- ✅ Package installable: `npm install homebridge-inteo-somfy-blinds`
- ✅ Package optimized: 17.0 KB (test files excluded)

**NPM Package:**
- Registry: https://registry.npmjs.org/homebridge-inteo-somfy-blinds
- Website: https://www.npmjs.com/package/homebridge-inteo-somfy-blinds (may have cache delay)
- Maintainer: juanroman

---

### ✅ GitHub Releases

**Requirement:** A GitHub release should be created for every new version of your plugin, with release notes.

**Status:** ✅ COMPLIANT

**Evidence:**
- ✅ GitHub Release v1.0.0 created with comprehensive release notes
- ✅ Release includes feature list, installation instructions, and limitations
- ✅ Links to NPM package and documentation
- ✅ Tagged commit: `v1.0.0`

**Release:**
- URL: https://github.com/juanroman/homebridge-inteo-somfy-blinds/releases/tag/v1.0.0
- Tag: v1.0.0
- Title: "v1.0.0 - Initial Release"

**Future Releases:**
- Create new GitHub release for each version published to NPM
- Include changelog with breaking changes, features, and bug fixes
- Link to corresponding NPM package version

---

## ENVIRONMENT

### ✅ Node.js LTS Support

**Requirement:** The plugin must run on all supported LTS versions of Node.js, at the time of writing this is Node v20, v22 and v24.

**Status:** ✅ COMPLIANT

**Evidence:**
- `package.json:24` - `"node": "^20.15.1 || ^22 || ^24"`
- `.github/workflows/ci.yml:15` - CI tests on Node v20, v22, and v24

---

### ✅ Graceful Start Without Config

**Requirement:** The plugin must successfully install and not start unless it is configured.

**Status:** ✅ COMPLIANT

**Evidence:**
- `src/platform.ts:105-143` - Validates configuration before starting
- Logs clear error messages for missing required fields
- Returns early without starting if config invalid

---

### ✅ No Post-Install Scripts

**Requirement:** The plugin must not execute post-install scripts that modify the users' system in any way.

**Status:** ✅ COMPLIANT

**Evidence:**
- No `postinstall` script in package.json
- Only `prepublishOnly` for development/build process

---

### ✅ No Special Startup Requirements

**Requirement:** The plugin must not require the user to run Homebridge in a TTY or with non-standard startup parameters, even for initial configuration.

**Status:** ✅ COMPLIANT

**Evidence:**
- Runs headless without any special requirements
- Configuration via Homebridge UI or config.json only

---

## CODEBASE

### ✅ Plugin Settings GUI

**Requirement:** The plugin must implement the Homebridge Plugin Settings GUI.

**Status:** ✅ COMPLIANT

**Evidence:**
- `config.schema.json` - Complete schema with:
  - Form controls for all settings
  - Validation (patterns, min/max, required fields)
  - Helpful descriptions and placeholders
  - Expandable advanced settings section
  - Array controls for multiple blinds

---

### ✅ No Analytics or Tracking

**Requirement:** The plugin must not contain any analytics or calls that enable you to track the user.

**Status:** ✅ COMPLIANT

**Evidence:**
- Code review: No analytics, telemetry, or tracking code found
- No external analytics services (Google Analytics, Mixpanel, etc.)
- No phone-home functionality beyond required Neocontrol API calls

---

### ✅ Homebridge Storage Directory

**Requirement:** If the plugin needs to write files to disk (cache, keys, etc.), it must store them inside the Homebridge storage directory.

**Status:** ✅ COMPLIANT

**Evidence:**
- Plugin does not write any files to disk
- No cache, keys, or persistent state storage
- State maintained in-memory only

---

### ✅ Error Handling

**Requirement:** The plugin must not throw unhandled exceptions, the plugin must catch and log its own errors.

**Status:** ✅ COMPLIANT

**Evidence:**
- `src/blindAccessory.ts:153-167` - Try/catch with error logging and HAP errors
- `src/neocontrolClient.ts:45-74` - Try/catch with retry logic
- `src/neocontrolClient.ts:82-108` - Timeout handling and error conversion
- All async operations wrapped in error handlers
- Errors logged to Homebridge logger, never thrown to framework

---

## Pre-Verification Checklist

Complete these tasks before submitting verification request:

### Critical (Must Complete)

- [x] Update Node.js version support to include v24
- [x] Research competing plugins to confirm unique functionality
- [x] Verify GitHub issues are enabled
- [x] Publish plugin to NPM
- [x] Create GitHub Release v1.0.0 with release notes

### Recommended

- [x] Run full test suite: `npm test` (48 tests, 97.94% coverage)
- [x] Run linter: `npm run lint` (no errors)
- [x] Document unique value proposition vs. any similar plugins
- [x] Build and verify package contents: `npm pack` and inspect (17.0 KB, optimized)
- [x] Package successfully published and installable from NPM

---

## Verification Submission

When all requirements are met:

1. Visit: https://github.com/homebridge/verified
2. Follow submission process in their README
3. Provide this checklist as evidence of compliance
4. Be prepared to address any reviewer feedback

---

## Maintenance Notes

After verification is granted:

- Create GitHub releases for all future versions
- Maintain compatibility with new Node.js LTS versions
- Keep config schema up to date
- Respond to issues promptly
- Follow Homebridge plugin best practices

---

## References

- [Verified Plugins Requirements](https://github.com/homebridge/verified/blob/latest/verified-plugins.md)
- [Homebridge Plugin Development Docs](https://developers.homebridge.io/)
- [Homebridge Verified Plugins List](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
