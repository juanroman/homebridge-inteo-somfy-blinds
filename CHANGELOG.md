# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.3]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/juanroman/homebridge-inteo-somfy-blinds/releases/tag/v1.0.0
