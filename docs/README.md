# Documentation

## For Contributors

- **[Release Process](RELEASE_PROCESS.md)** - How to create new releases using the automated pipeline
- **[OIDC Setup](OIDC_SETUP.md)** - One-time npm authentication configuration
- **[Ubuntu Testing](UBUNTU_TESTING.md)** - Development and testing guide using Parallels

## Automated Release Pipeline

We use GitHub Actions with OIDC Trusted Publishing for secure, automated releases:

1. **Create version tag** → `npm version patch/minor/major`
2. **Push tag** → `git push --tags`
3. **Tests run automatically** on Node 20, 22, 24
4. **Approve deployment** in GitHub UI
5. **Publish to npm** automatically via OIDC (no tokens needed)
6. **GitHub release created** automatically

See [Release Process](RELEASE_PROCESS.md) for details.

## Quick Links

- [Main README](../README.md) - Plugin overview and usage
- [CHANGELOG](../CHANGELOG.md) - Version history
- [GitHub Releases](https://github.com/juanroman/homebridge-inteo-somfy-blinds/releases)
- [npm Package](https://www.npmjs.com/package/homebridge-inteo-somfy-blinds)
