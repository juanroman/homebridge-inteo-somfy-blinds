# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-06-29

### Changed

- Upgraded TypeScript `^5.7.2` → `^6.0.3`
- Upgraded homebridge (dev) `^2.0.0-beta.0` → `^2.1.0` (stable); updated `engines.homebridge` range to `^2.0.0`
- Upgraded vitest + @vitest/coverage-v8 `^4.0.15` → `^4.1.9`
- Upgraded eslint `^10.4.0` → `^10.6.0`
- Upgraded typescript-eslint `^8.60.0` → `^8.62.1`
- Upgraded prettier `^3.4.1` → `^3.9.3`
- Upgraded rimraf `^6.0.1` → `^6.1.3`

## [1.1.1] - 2026-05-31

### Fixed

- **Commands no longer time out even though the blind moves.** The UDP socket was binding to an ephemeral port (OS-assigned) instead of port 9325. The hub broadcasts its ACK back to port 9325, so the ACK was arriving with no socket listening — every command reported failure and the blind was stuck at 50% (unknown) in HomeKit despite physically moving. Fix: socket now binds to port 9325 before sending, matching the hub's expected reply target.

## [1.1.0] - 2026-05-31

### Changed

- **Commands now sent via direct UDP broadcast to the hub on your local network** — no cloud relay required. The plugin sends 27-byte binary packets to `255.255.255.255:9325` and waits for the hub's ACK. This eliminates the dependency on `iOS.neocontrolglobal.com`, which has gone down twice.
- Renamed all internal Neocontrol references to Inteo/Somfy. The plugin is now truly local.
- Removed the `baseUrl` configuration field — it no longer has any meaning. Existing configs with `baseUrl` set will silently ignore it.
- Retuned advanced defaults: `retryAttempts` raised from 3 → 4, `requestTimeout` dropped from 5000 → 500 ms (UDP on LAN is much faster than HTTP over cloud).

### Removed

- `baseUrl` configuration option (Neocontrol cloud API endpoint)

## [1.0.6] - 2026-05-29

### Changed

- Dropped Node.js 20 support (EOL); supported engines are now `^22 || ^24`
- Upgraded ESLint to v10
- Added `npm audit --audit-level=moderate` step to CI pipeline

### Security

- Bumped postcss from 8.5.6 → 8.5.12 (CVE fix)

## [1.0.5] - 2026-03-29

### Security

- Bumped rollup from 4.53.3 → 4.59.0
- Bumped minimatch (transitive)
- Bumped flatted from 3.3.3 → 3.4.2
- Bumped picomatch from 4.0.3 → 4.0.4

### Added

- Homebridge Verified badge in README

## [1.0.4] - 2025-12-08

### Fixed

- Removed peerDependencies to prevent npm 7+ from auto-installing homebridge during verification (homebridge kept in devDependencies for TypeScript compilation, engines field used for compatibility declaration)

## [1.0.3] - 2025-12-08

### Fixed

- Regenerated package-lock.json to remove stale homebridge dependency entries for Homebridge verification compliance

## [1.0.2] - 2025-12-08

### Fixed

- config.schema.json now uses JSON Schema Draft 7 compliant `required` arrays instead of boolean properties
- Removed homebridge from devDependencies (kept in peerDependencies only) for Homebridge verification compliance

## [1.0.1] - 2025-12-08

### Added

- CHANGELOG.md to track version history and changes

## [1.0.0] - 2025-12-08

### Added

- Initial release of homebridge-inteo-somfy-blinds
- Support for Somfy RTS blinds via Neocontrol/Inteo hub
- Window Covering accessory with position control (0-100%)
- Scene-based blind control (UP, DOWN, STOP, FAVORITE)
- Auto-discovery of blinds from Neocontrol API
- Configuration UI with schema validation
- Retry logic for API calls (3 attempts with exponential backoff)
- Comprehensive test suite (48 tests, 97.94% coverage)
- Support for Node.js v20, v22, and v24
- TypeScript implementation with full type safety

[1.1.2]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.6...v1.1.0
[1.0.6]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/releases/tag/v1.0.0
