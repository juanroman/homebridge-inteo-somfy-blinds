# OIDC Setup for Automated npm Publishing

This guide explains how to configure OIDC (OpenID Connect) Trusted Publishing for secure, automated npm publishing from GitHub Actions.

---

## Overview

### What is OIDC Trusted Publishing?

OIDC Trusted Publishing uses OpenID Connect to authenticate GitHub Actions directly with npm, eliminating the need for long-lived authentication tokens.

### Why We Use OIDC

- ✅ **No long-lived tokens** - Uses temporary, cryptographically-signed credentials
- ✅ **Most secure** - Workflow-specific authentication
- ✅ **Zero maintenance** - No token expiration, rotation, or storage
- ✅ **Automatic provenance** - Supply chain security built-in
- ✅ **No secrets needed** - Nothing to store in GitHub Secrets

### How It Works

1. GitHub Actions generates a temporary OIDC token for the workflow run
2. npm verifies the token matches your configured trusted publisher
3. npm grants temporary publish permissions for that specific run
4. Token expires immediately after use

**No secrets, no tokens, no rotation needed.**

---

## One-Time Setup

### Step 1: Configure Trusted Publisher on npmjs.com

1. **Login to npmjs.com:**
   - Go to <https://www.npmjs.com/login>
   - Complete 2FA if enabled

2. **Navigate to your package:**
   - Go to <https://www.npmjs.com/package/homebridge-inteo-somfy-blinds>
   - Click **"Settings"** tab

3. **Configure Trusted Publisher:**
   - Scroll to **"Trusted Publishers"** section
   - Click **"Add Trusted Publisher"**
   - Select **"GitHub Actions"**

4. **Enter workflow details** (must match exactly):
   - **Organization/User:** `juanroman`
   - **Repository:** `homebridge-inteo-somfy-blinds`
   - **Workflow filename:** `release.yml` (case-sensitive, include `.yml`)
   - **Environment name:** `production`

5. **Save configuration:**
   - Click **"Add"** or **"Save"**
   - Verify it appears in the Trusted Publishers list

### Step 2: Verify Workflow Configuration

Our workflow at [.github/workflows/release.yml](../.github/workflows/release.yml) already has the required configuration:

**Check these are present:**

1. **`id-token: write` permission on publish job:**
   ```yaml
   publish:
     runs-on: ubuntu-latest
     needs: approve
     environment: production  # Must match npmjs.com config
     permissions:
       id-token: write  # Required for OIDC
   ```

2. **Environment matches npmjs.com:**
   ```yaml
   environment: production
   ```

3. **npm CLI upgrade step** (for npm 11.5.1+ requirement):
   ```yaml
   - name: Upgrade npm for OIDC support
     run: |
       npm install -g npm@latest
   ```

4. **No registry-url configured** in setup-node:
   ```yaml
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: '20'
       cache: 'npm'
       # No registry-url - OIDC auto-detects
   ```

### Step 3: Verify No NPM_TOKEN

OIDC doesn't use tokens. If you previously configured an NPM_TOKEN:

1. Go to GitHub → Settings → Secrets and variables → Actions
2. **Delete** `NPM_TOKEN` if it exists
3. OIDC will work without it

---

## Verification

After setup, verify OIDC is configured correctly:

### Checklist

- [ ] Trusted publisher configured on npmjs.com
- [ ] Organization: `juanroman`
- [ ] Repository: `homebridge-inteo-somfy-blinds`
- [ ] Workflow filename: `release.yml`
- [ ] Environment name: `production`
- [ ] No `NPM_TOKEN` in GitHub Secrets
- [ ] Workflow has `id-token: write` permission
- [ ] Workflow has `environment: production` on publish job
- [ ] npm upgrade step exists in workflow

### Test the Configuration

Create a test release to verify OIDC works:

```bash
# Create test tag
git tag v0.0.0-oidc-test
git push origin v0.0.0-oidc-test
```

Monitor the workflow in GitHub Actions:
- Tests should pass
- Approval gate waits for you
- You can reject to test without publishing
- Or approve to test full flow (will publish to npm)

Clean up test tag after verification:
```bash
git tag -d v0.0.0-oidc-test
git push origin :refs/tags/v0.0.0-oidc-test
```

---

## Troubleshooting

### "OIDC token verification failed"

**Cause:** Configuration mismatch between npm and GitHub

**Solutions:**

1. Verify workflow filename matches **exactly** (case-sensitive, include `.yml`)
2. Verify organization/repository names are correct
3. Verify environment name matches exactly (`production`)
4. Check `id-token: write` permission is present in publish job (not just top-level)
5. Ensure `environment: production` is on the **publish** job

### "No OIDC token found"

**Cause:** Missing `id-token: write` permission

**Solution:**

Add to your publish job:

```yaml
publish:
  permissions:
    id-token: write
```

### "npm ERR! code ENEEDAUTH"

**Cause:** OIDC not detecting or npm version too old

**Solutions:**

1. **Check npm version in logs:**
   - GitHub Actions runners have npm 10.x by default
   - OIDC requires npm 11.5.1+
   - Our workflow upgrades to 11.6.4+ automatically

2. **Verify upgrade step exists:**
   ```yaml
   - name: Upgrade npm for OIDC support
     run: npm install -g npm@latest
   ```

3. **Check workflow has no registry-url:**
   - Don't set `registry-url` in setup-node
   - This blocks OIDC auto-detection

### "Cannot publish over previously published version"

**This is NOT an OIDC error.** This means authentication **succeeded**, but the version already exists.

**Solution:** Bump version and try again:
```bash
npm version patch
git push && git push --tags
```

---

## How OIDC Publishes Appear on npm

Packages published via OIDC show:

```
published X minutes ago by GitHub Actions <npm-oidc-no-reply@github.com>
```

This confirms OIDC is working correctly.

---

## Summary

### What You Have

- ✅ Secure, token-free npm publishing
- ✅ Automatic provenance attestations
- ✅ No token management or rotation
- ✅ Full supply chain security

### What You Don't Need

- ❌ No NPM_TOKEN in GitHub Secrets
- ❌ No token expiration to worry about
- ❌ No manual token rotation
- ❌ No risk of leaked tokens

---

## References

- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers/)
- [npm OIDC Announcement (July 2025)](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [GitHub OIDC Documentation](https://docs.github.com/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm Provenance Attestations](https://docs.npmjs.com/generating-provenance-statements/)

---

**Last Updated:** December 8, 2025
