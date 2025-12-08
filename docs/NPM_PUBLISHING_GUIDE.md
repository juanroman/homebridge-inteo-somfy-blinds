# NPM Publishing Guide

Complete guide for publishing `homebridge-inteo-somfy-blinds` to NPM for the first time.

---

## Prerequisites

Before publishing, ensure you have:

- [x] All tests passing locally (`npm test`)
- [x] Code builds successfully (`npm run build`)
- [x] Git working tree is clean (all changes committed)
- [x] You're on the `main` branch
- [x] Latest changes pushed to GitHub
- [x] CI/CD passing on GitHub Actions

---

## Step 1: Create NPM Account (If You Don't Have One)

### Option A: Via Website
1. Visit https://www.npmjs.com/signup
2. Choose a username (will be public)
3. Enter email and password
4. Verify your email address

### Option B: Via CLI
```bash
npm adduser
```

---

## Step 2: Login to NPM

Authenticate your local npm CLI with your NPM account:

```bash
npm login
```

You'll be prompted for:
- **Username**: Your NPM username
- **Password**: Your NPM password
- **Email**: Your public email (will be visible on NPM)
- **One-time password**: If you have 2FA enabled (recommended)

**Verify you're logged in:**
```bash
npm whoami
```

Should display your NPM username.

---

## Step 3: Verify Package Configuration

### Check package.json

Ensure these fields are correct:

```bash
cat package.json | jq '{name, version, description, author, license, repository, keywords}'
```

**Critical fields:**
- `name`: "homebridge-inteo-somfy-blinds" (must be unique on NPM)
- `version`: "1.0.0" (follow semantic versioning)
- `description`: Clear, concise description
- `license`: "MIT"
- `author`: Your name
- `repository`: GitHub URL
- `keywords`: For discoverability

### Check what will be published

```bash
npm pack --dry-run
```

This shows exactly what files will be included in the package.

**Expected files:**
- `dist/` - Compiled JavaScript
- `config.schema.json` - Homebridge UI config
- `package.json`
- `README.md`
- `LICENSE`

**Should NOT include:**
- `src/` - TypeScript source (only compiled dist)
- `test/` - Test files
- `node_modules/` - Dependencies
- `.git/` - Git files

---

## Step 4: Build for Production

Clean build to ensure dist is up to date:

```bash
npm run build
```

Verify the build output:

```bash
ls -la dist/
```

Should see:
- `dist/src/` - Compiled JS files
- `dist/src/index.js` - Main entry point
- TypeScript declaration files (`.d.ts`)

---

## Step 5: Test the Package Locally

Create a test package to inspect before publishing:

```bash
npm pack
```

This creates `homebridge-inteo-somfy-blinds-1.0.0.tgz`

**Inspect the package:**

```bash
tar -tzf homebridge-inteo-somfy-blinds-1.0.0.tgz
```

**Test installation locally (optional):**

```bash
# In a temp directory
mkdir /tmp/test-install
cd /tmp/test-install
npm install ~/Dev/github/homebridge-inteo-somfy-blinds/homebridge-inteo-somfy-blinds-1.0.0.tgz
```

**Clean up:**

```bash
cd ~/Dev/github/homebridge-inteo-somfy-blinds
rm homebridge-inteo-somfy-blinds-1.0.0.tgz
```

---

## Step 6: Publish to NPM 🚀

### For Public Package (Default)

```bash
npm publish
```

### If You Get an Error About Scope

If npm thinks your package is scoped (starts with @), use:

```bash
npm publish --access public
```

### What Happens During Publish

1. `prepublishOnly` script runs:
   - Linter runs
   - Tests run
   - Build runs
2. Package is uploaded to NPM registry
3. Package becomes immediately available

**Expected output:**
```
npm notice
npm notice 📦  homebridge-inteo-somfy-blinds@1.0.0
npm notice === Tarball Contents ===
npm notice 1.1kB  LICENSE
npm notice 5.2kB  README.md
npm notice 3.4kB  config.schema.json
npm notice 2.1kB  package.json
npm notice 42.3kB dist/...
npm notice === Tarball Details ===
npm notice name:          homebridge-inteo-somfy-blinds
npm notice version:       1.0.0
npm notice package size:  XX.X kB
npm notice unpacked size: XX.X kB
npm notice total files:   XX
npm notice
+ homebridge-inteo-somfy-blinds@1.0.0
```

---

## Step 7: Verify Publication

### Check on NPM Website

Visit: https://www.npmjs.com/package/homebridge-inteo-somfy-blinds

You should see:
- ✅ Package name and version
- ✅ README displayed
- ✅ Install command
- ✅ Repository link
- ✅ Keywords

### Verify via CLI

```bash
npm view homebridge-inteo-somfy-blinds
```

Should show all package metadata.

### Test Installation

```bash
# In a temporary directory
mkdir /tmp/test-npm-install
cd /tmp/test-npm-install
npm install homebridge-inteo-somfy-blinds
```

Verify it installed correctly:

```bash
ls node_modules/homebridge-inteo-somfy-blinds/
```

---

## Step 8: Update Documentation

After successful publish, update the verification checklist:

```bash
# Edit docs/VERIFICATION_CHECKLIST.md
# Mark "Publish plugin to NPM" as complete
```

---

## Common Issues & Solutions

### Issue: "You do not have permission to publish"

**Solution:** Package name might be taken. Check:
```bash
npm view homebridge-inteo-somfy-blinds
```

If it shows another package, you'll need to rename or contact NPM.

### Issue: "This package has been marked as private"

**Solution:** Check `package.json` doesn't have:
```json
"private": true
```

### Issue: "npm ERR! code ENEEDAUTH"

**Solution:** You're not logged in:
```bash
npm login
npm whoami  # Verify
```

### Issue: "prepublishOnly script failed"

**Solution:** Fix the errors reported:
- Linting errors: `npm run lint:fix`
- Test failures: Fix failing tests
- Build errors: Check TypeScript compilation

### Issue: "Version already published"

**Solution:** You've already published this version. To publish again:
1. Update version in `package.json`
2. Commit the change
3. Try again

```bash
npm version patch  # 1.0.0 -> 1.0.1
git push && git push --tags
npm publish
```

---

## Post-Publication Checklist

After successful publication:

- [ ] Verify package appears on npmjs.com
- [ ] Test installation: `npm install -g homebridge-inteo-somfy-blinds`
- [ ] Update VERIFICATION_CHECKLIST.md
- [ ] Create GitHub Release v1.0.0
- [ ] Announce on relevant forums/communities (if desired)

---

## NPM Best Practices

### 1. Enable Two-Factor Authentication (2FA)

**Highly recommended for security:**

```bash
npm profile enable-2fa auth-and-writes
```

This requires OTP for login AND publishing.

### 2. Use Semantic Versioning

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### 3. Never Unpublish

NPM doesn't allow unpublishing after 24 hours. Always:
- Test thoroughly before publishing
- Use patch versions to fix issues
- Deprecate instead of unpublish

### 4. Keep README Updated

The README on NPM is from the package, not GitHub. Always update it before publishing.

---

## Next Steps After Publishing

1. **Create GitHub Release**
   - Tag: `v1.0.0`
   - Title: "v1.0.0 - Initial Release"
   - Include release notes
   - Link to NPM package

2. **Submit for Homebridge Verification**
   - Visit: https://github.com/homebridge/verified
   - Follow their submission process
   - Reference VERIFICATION_CHECKLIST.md

3. **Monitor for Issues**
   - Watch GitHub issues
   - Respond to user questions
   - Fix bugs in patch releases

---

## Useful NPM Commands

```bash
# Check what files will be published
npm pack --dry-run

# View your published package
npm view homebridge-inteo-somfy-blinds

# Check if package name is available
npm view <package-name>  # Shows 404 if available

# List your published packages
npm profile get

# View package download stats (after some time)
npm view homebridge-inteo-somfy-blinds downloads

# Deprecate a version (don't use)
npm deprecate homebridge-inteo-somfy-blinds@1.0.0 "Use 1.0.1 instead"

# Update package version
npm version patch  # or minor, or major
```

---

## References

- [NPM Publishing Documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Homebridge Plugin Development](https://developers.homebridge.io/)
- [package.json Documentation](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)

---

## Support

If you encounter issues:
1. Check NPM status: https://status.npmjs.org/
2. NPM Support: https://www.npmjs.com/support
3. Homebridge Discord: https://discord.gg/homebridge
