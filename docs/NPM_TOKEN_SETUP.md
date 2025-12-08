# npm Authentication Setup Guide

This guide explains how to configure npm authentication for automated publishing in the CI/CD pipeline.

> **Critical Update (December 2025):** npm Classic tokens were deprecated on December 9, 2025. This guide uses **OIDC Trusted Publishing** (recommended) or **Granular Access Tokens** (fallback).

---

## Table of Contents

- [Overview](#overview)
- [Option 1: OIDC Trusted Publishing (Recommended)](#option-1-oidc-trusted-publishing-recommended)
- [Option 2: Granular Access Tokens](#option-2-granular-access-tokens)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The automated release pipeline needs to authenticate with npm to publish packages. Unlike local development where you can use interactive 2FA authentication, CI/CD environments need a non-interactive authentication method.

**Two Modern Solutions:**

### Option 1: OIDC Trusted Publishing (Recommended)

- ✅ **No long-lived tokens** - uses temporary OIDC credentials
- ✅ **Most secure** - cryptographically-signed, workflow-specific
- ✅ **No token management** - no expiration, rotation, or storage needed
- ✅ **Automatic provenance** - supply chain security built-in
- ✅ **Zero secrets** - nothing to store in GitHub Secrets
- ⚠️ Requires one-time configuration on npmjs.com

### Option 2: Granular Access Tokens

- ✅ **Scoped permissions** - limit access to specific packages
- ✅ **IP restrictions** - optional CIDR-based filtering
- ⚠️ **7-90 day expiration** - requires periodic rotation (new in 2025)
- ⚠️ **Requires "Bypass 2FA"** - for CI/CD workflows
- ⚠️ **Token management** - must store in GitHub Secrets

**We strongly recommend Option 1 (OIDC) for new setups.** It's more secure and requires less maintenance.

---

## Option 1: OIDC Trusted Publishing (Recommended)

OIDC Trusted Publishing became generally available in July 2025. It uses OpenID Connect to authenticate GitHub Actions directly with npm, eliminating the need for long-lived tokens.

### How It Works

1. GitHub Actions generates a temporary, cryptographically-signed OIDC token
2. npm verifies the token matches your configured trusted publisher
3. npm grants temporary publish permissions for that specific workflow run
4. Token expires immediately after use

**No secrets, no tokens, no rotation needed.**

### Setup Steps

#### Step 1: Configure Trusted Publisher on npm

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

4. **Enter workflow details:**
   - **Organization/User:** `juanroman`
   - **Repository:** `homebridge-inteo-somfy-blinds`
   - **Workflow filename:** `release.yml` (must match exactly, including `.yml`)
   - **Environment name:** `production` (must match your GitHub Environment)

5. **Save configuration:**
   - Click **"Add"** or **"Save"**
   - Verify it appears in the Trusted Publishers list

#### Step 2: Update GitHub Actions Workflow

Our workflow already has the required permissions! The [.github/workflows/release.yml](../.github/workflows/release.yml) file includes:

```yaml
release:
  runs-on: ubuntu-latest
  needs: publish
  permissions:
    contents: write  # Required to create releases
```

**Add `id-token: write` permission:**

We need to add one line to the `publish` job:

```yaml
publish:
  runs-on: ubuntu-latest
  needs: approve
  permissions:
    id-token: write  # Required for OIDC authentication
```

#### Step 3: Remove NPM_TOKEN (if configured)

If you previously configured an NPM_TOKEN in GitHub Secrets:

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Find `NPM_TOKEN` in the list
3. Click **"Remove"** or **"Delete"**

OIDC doesn't need or use this secret.

#### Step 4: Test the Configuration

Create a test release to verify OIDC authentication works:

```bash
# Create a test tag (won't publish if you reject)
git tag v0.0.0-oidc-test
git push origin v0.0.0-oidc-test
```

Monitor the workflow in GitHub Actions:

- Tests should pass
- Approval gate should wait for you
- **You can reject** to test without publishing
- Or approve to test full flow (will publish to npm)

**Clean up test tag:**

```bash
git tag -d v0.0.0-oidc-test
git push origin :refs/tags/v0.0.0-oidc-test
# Delete GitHub release if created
```

### Verification

After successful configuration:

- ✅ No `NPM_TOKEN` in GitHub Secrets
- ✅ Trusted Publisher configured on npmjs.com
- ✅ Workflow includes `id-token: write` permission
- ✅ Test publish succeeds

**You're done! No token management needed.**

---

## Option 2: Granular Access Tokens

Use this approach if OIDC Trusted Publishing doesn't work for your use case.

> **Note:** As of December 2025, Classic tokens are no longer available. Only Granular Access Tokens can be created.

### Important Changes in 2025

- **New default expiration:** 7 days (down from 30 days)
- **Maximum expiration:** 90 days (down from unlimited)
- **Bypass 2FA required:** For CI/CD automation with write permissions
- **Requires rotation:** Every 7-90 days

### Setup Steps

#### Step 1: Create Granular Access Token

1. **Login to npmjs.com:**
   - Go to <https://www.npmjs.com/login>
   - Complete 2FA if enabled

2. **Navigate to Access Tokens:**
   - Click your profile picture (top right)
   - Select **"Access Tokens"**
   - Or go directly to: <https://www.npmjs.com/settings/~/tokens>

3. **Generate New Token:**
   - Click **"Generate New Token"**
   - Select **"Granular Access Token"** (Classic is no longer available)

4. **Configure Token:**

   **Basic Information:**
   - **Token name:** `homebridge-inteo-somfy-blinds-ci`
   - **Expiration:** Choose 30, 60, or 90 days
     - Shorter is more secure
     - Requires more frequent rotation

   **Permissions:**
   - **Packages and scopes:** Select specific packages
     - Click **"Add package"**
     - Enter `homebridge-inteo-somfy-blinds`
     - Select **"Read and write"** permissions
   - **Organizations:** Leave empty (not needed for personal packages)

   **IP Ranges (Optional):**
   - Leave empty for GitHub Actions (GitHub uses dynamic IPs)
   - Or enter GitHub Actions IP ranges if you want stricter security

   **2FA Settings:**
   - ⚠️ **Check "Bypass 2FA for automation"**
   - This is required for CI/CD workflows
   - Without this, npm publish will fail asking for OTP

5. **Copy Token:**
   - Token will be displayed (shown only once!)
   - Copy it immediately
   - Example format: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. **Store Safely:**
   - Paste into a password manager temporarily
   - You'll need this for GitHub Secrets setup
   - **Never commit to git or share publicly**

#### Step 2: Add Token to GitHub Secrets

1. **Navigate to Repository Settings:**
   - Go to <https://github.com/juanroman/homebridge-inteo-somfy-blinds>
   - Click **"Settings"** tab (requires admin access)

2. **Open Secrets Configuration:**
   - In left sidebar, expand **"Secrets and variables"**
   - Click **"Actions"**

3. **Create New Secret:**
   - Click **"New repository secret"**
   - **Name:** `NPM_TOKEN` (must be exactly this)
   - **Secret:** Paste the token from Step 1
   - Click **"Add secret"**

4. **Verify Secret:**
   - You should see `NPM_TOKEN` in the list
   - Value will be hidden (shown as `***`)
   - Last updated timestamp shown

#### Step 3: Create GitHub Environment (if not done)

Our workflow uses the "production" environment for manual approval:

1. **Navigate to Environments:**
   - Still in repository Settings
   - In left sidebar, click **"Environments"**

2. **Create Production Environment (if needed):**
   - Click **"New environment"**
   - **Name:** `production` (must be exactly this)
   - Click **"Configure environment"**

3. **Configure Protection Rules:**
   - Check **"Required reviewers"**
   - Select yourself from the dropdown
   - Optional: Set **"Wait timer"** (e.g., 5 minutes)
   - Click **"Save protection rules"**

#### Step 4: Test the Configuration

Create a test release:

```bash
git tag v0.0.0-token-test
git push origin v0.0.0-token-test
```

Monitor in GitHub Actions - the workflow should:

- Run tests successfully
- Wait for your approval
- Publish to npm using your token
- Create GitHub release

**Clean up:**

```bash
git tag -d v0.0.0-token-test
git push origin :refs/tags/v0.0.0-token-test
```

### Token Rotation

**Important:** Granular tokens expire! Set a calendar reminder.

**Every 7-90 days (before expiration):**

1. Create new token on npmjs.com (follow Step 1 above)
2. Update GitHub Secret:
   - GitHub → Settings → Secrets → Actions
   - Click on `NPM_TOKEN`
   - Click **"Update secret"**
   - Paste new token value
3. Delete old token on npmjs.com:
   - npmjs.com → Settings → Access Tokens
   - Find old token
   - Click **"Delete"**
4. Test with a dry run (optional but recommended)

**Set expiration reminders:**

- If you chose 30 days, set reminder for day 25
- If you chose 60 days, set reminder for day 55
- If you chose 90 days, set reminder for day 85

**This is why we recommend OIDC - no rotation needed!**

---

## Security Best Practices

### For OIDC (Recommended)

- ✅ Verify trusted publisher configuration is exact
- ✅ Use GitHub Environment protection rules
- ✅ Monitor npm publish notifications
- ✅ Review provenance attestations
- ✅ Keep workflow filename consistent

### For Granular Tokens

- ✅ Use shortest practical expiration (30 days recommended)
- ✅ Enable "Bypass 2FA for automation" only
- ✅ Scope to specific packages only
- ✅ Set calendar reminders for rotation
- ✅ Rotate immediately if compromised
- ❌ Don't commit tokens to git (even in .env)
- ❌ Don't share tokens in Slack/email
- ❌ Don't use read-only tokens for publishing

### General Security

**Enable npm notifications:**

1. Go to <https://www.npmjs.com/settings/~/profile>
2. Scroll to **"Email Notifications"**
3. Enable **"Package publishes"**
4. You'll receive email when package is published

**This helps detect unauthorized publishes.**

**Monitor your package:**

- Review npm publish history regularly
- Check provenance attestations (OIDC provides these automatically)
- Watch for unexpected versions

---

## Troubleshooting

### OIDC-Specific Issues

#### "OIDC token verification failed"

**Cause:** Configuration mismatch between npm and GitHub

**Solutions:**

1. Verify workflow filename matches exactly (case-sensitive, include `.yml`)
2. Verify organization/repository names are correct
3. Verify environment name matches exactly (`production`)
4. Check `id-token: write` permission is present
5. Ensure you're publishing from the correct repository

#### "No OIDC token found"

**Cause:** Missing `id-token: write` permission

**Solution:**

Add to your publish job:

```yaml
permissions:
  id-token: write
```

### Token-Specific Issues

#### "Authentication error" (E401)

**Cause:** Token invalid, expired, or missing

**Solutions:**

1. Verify `NPM_TOKEN` exists in GitHub Secrets
2. Check token hasn't expired (7-90 day limit)
3. Verify token has "Read and write" permissions
4. Ensure "Bypass 2FA" is enabled
5. Check token is scoped to correct package

#### "2FA required" error

**Cause:** Token doesn't have "Bypass 2FA" enabled

**Solution:**

1. Create new token with "Bypass 2FA" checked
2. Update GitHub Secret with new token
3. Delete old token

### General Issues

#### "Cannot publish over previously published version" (E403)

**Cause:** Version already exists on npm

**Solution:**

This is not an authentication issue. Create a new version:

```bash
npm version patch
git push && git push --tags
```

#### Package not found after publish

**Cause:** npmjs.com website cache delay (normal)

**Verification:**

```bash
# This should work immediately (registry API)
npm view homebridge-inteo-somfy-blinds

# This might show 404 for a few minutes (website cache)
# https://www.npmjs.com/package/homebridge-inteo-somfy-blinds
```

Wait 5-15 minutes for website cache to refresh.

---

## Migration from Classic Tokens

If you previously used Classic tokens (deprecated December 9, 2025):

### Option A: Migrate to OIDC (Recommended)

1. Follow [Option 1: OIDC Trusted Publishing](#option-1-oidc-trusted-publishing-recommended)
2. Delete `NPM_TOKEN` from GitHub Secrets
3. Delete Classic token from npmjs.com
4. Test with a dry run

### Option B: Migrate to Granular Token

1. Follow [Option 2: Granular Access Tokens](#option-2-granular-access-tokens)
2. Update `NPM_TOKEN` in GitHub Secrets with new Granular token
3. Delete Classic token from npmjs.com
4. Set calendar reminder for rotation
5. Test with a dry run

**We strongly recommend Option A (OIDC)** - it's more secure and requires no ongoing maintenance.

---

## Summary

### Recommended Setup (OIDC)

**One-time setup:**

- [ ] Configure Trusted Publisher on npmjs.com
- [ ] Add `id-token: write` to workflow
- [ ] Remove `NPM_TOKEN` from GitHub Secrets (if present)
- [ ] Test with dry run

**Ongoing maintenance:**

- [ ] None! OIDC handles everything automatically

### Alternative Setup (Granular Token)

**One-time setup:**

- [ ] Create Granular Access Token on npmjs.com
- [ ] Add token to GitHub Secrets as `NPM_TOKEN`
- [ ] Create GitHub Environment named "production"
- [ ] Test with dry run

**Ongoing maintenance:**

- [ ] Rotate token every 7-90 days (before expiration)
- [ ] Set calendar reminders
- [ ] Monitor npm publish notifications
- [ ] Revoke immediately if compromised

---

## References

- [npm Trusted Publishing Documentation](https://docs.npmjs.com/trusted-publishers/)
- [npm Trusted Publishing Announcement (July 2025)](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [npm Classic Token Deprecation (December 2025)](https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/)
- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm Granular Access Tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens/)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## Need Help?

- **npm Support:** <https://www.npmjs.com/support>
- **GitHub Support:** <https://support.github.com/>
- **Security Issue:** Revoke token/publisher immediately, reconfigure

---

**Last Updated:** December 8, 2025
