# Release Process

This document explains how to create new releases of `homebridge-inteo-somfy-blinds` using the automated release pipeline.

---

## Overview

The release process is **semi-automated** with a **manual approval gate** for safety:

1. **You create a version tag** (absolute control over when releases happen)
2. **GitHub Actions runs tests** automatically
3. **You approve the deployment** after reviewing test results
4. **GitHub Actions publishes to npm** automatically
5. **GitHub Actions creates release** automatically

**You have control at every critical step.**

---

## Prerequisites

Before your first release, ensure you've completed the one-time setup:

- [x] OIDC Trusted Publisher configured on npmjs.com (see [OIDC_SETUP.md](OIDC_SETUP.md))
- [x] GitHub Environment "production" created with you as required reviewer
- [x] All tests passing locally (`npm test`)
- [x] Git working tree is clean
- [x] On the `main` branch
- [x] Latest changes pushed to GitHub

---

## Creating a Release

### Step 1: Determine Version Type

Follow [Semantic Versioning](https://semver.org/):

| Version Type | When to Use | Example |
|--------------|-------------|---------|
| **Patch** | Bug fixes, documentation updates | 1.0.0 → 1.0.1 |
| **Minor** | New features (backward compatible) | 1.0.1 → 1.1.0 |
| **Major** | Breaking changes | 1.1.0 → 2.0.0 |

### Step 2: Create Version Tag

The `npm version` command updates `package.json` and creates a git tag automatically:

**For a patch release (bug fixes):**
```bash
npm version patch
```

**For a minor release (new features):**
```bash
npm version minor
```

**For a major release (breaking changes):**
```bash
npm version major
```

**Example output:**
```
v1.0.1
```

### Step 3: Push to Trigger Pipeline

Push both the commit and the tag:

```bash
git push && git push --tags
```

**What happens next:**
- GitHub receives the tag
- Release workflow triggers automatically
- Tests start running on Node 20, 22, and 24

### Step 4: Monitor Test Progress

Visit the Actions tab in GitHub:

```
https://github.com/juanroman/homebridge-inteo-somfy-blinds/actions
```

You'll see a workflow run named after your tag (e.g., "v1.0.1").

**What's running:**
- Format check (`npm run format:check`)
- Linting (`npm run lint`)
- Build (`npm run build`)
- Tests with coverage (`npm run test:coverage`)
- Running in parallel on Node 20, 22, and 24

### Step 5: Review and Approve

Once all tests pass, GitHub will:

1. **Pause the workflow** at the "approve" job
2. **Send you a notification** (email/GitHub notification)
3. **Wait for your approval**

**To approve:**

1. Go to the workflow run in GitHub Actions
2. Click on the "approve" job
3. Click **"Review deployments"** button
4. Check the box next to "production"
5. Click **"Approve and deploy"** button

**To reject:**

1. Follow steps 1-4 above
2. Click **"Reject"** button instead
3. Workflow will stop (no deployment)

**Review checklist before approving:**
- ✅ All tests passed on Node 20, 22, and 24
- ✅ No unexpected errors in logs
- ✅ Version number is correct
- ✅ You're ready for users to receive this update

### Step 6: Automated Publishing

After you approve, GitHub Actions will:

1. **Build the production bundle**
2. **Publish to npm** via OIDC authentication
3. **Verify** the package is installable
4. **Create GitHub release** with auto-generated notes

**This takes about 2-3 minutes.**

### Step 7: Verify Release

Once complete, verify everything worked:

**Check npm:**
```bash
npm view homebridge-inteo-somfy-blinds
```

**Check GitHub release:**
```
https://github.com/juanroman/homebridge-inteo-somfy-blinds/releases
```

**Test installation:**
```bash
# In a temporary directory
npm install homebridge-inteo-somfy-blinds@latest
```

---

## Complete Example

Here's a complete example of releasing a bug fix (patch version):

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull

# 2. Ensure all changes are committed
git status  # Should show "working tree clean"

# 3. Run tests locally (optional but recommended)
npm test

# 4. Create patch version tag (1.0.0 → 1.0.1)
npm version patch

# 5. Push commit and tag
git push && git push --tags

# 6. Go to GitHub Actions and monitor progress
# https://github.com/juanroman/homebridge-inteo-somfy-blinds/actions

# 7. When notified, review test results and approve deployment

# 8. Wait for automated publish and release creation

# 9. Verify release
npm view homebridge-inteo-somfy-blinds
```

**Total time:** ~5-10 minutes (mostly automated)

---

## Canceling a Release

### Before Approval

If you created a tag by mistake, you can delete it before approving:

```bash
# Delete local tag
git tag -d v1.0.1

# Delete remote tag
git push origin :refs/tags/v1.0.1
```

This will cancel the workflow. You can also click **"Reject"** in the GitHub UI.

### After Approval (npm publish started)

**You cannot stop the publish once approved.**

If the package is published with a critical bug, see [Rollback Strategy](#rollback-strategy) below.

---

## Rollback Strategy

### If You Published a Broken Version

**Option 1: Quick Patch (Recommended)**

Publish a new version with the fix:

```bash
# Fix the bug in your code
# Commit the fix
git add .
git commit -m "fix: critical bug in blindAccessory"

# Create new patch version
npm version patch  # v1.0.1 → v1.0.2

# Trigger release
git push && git push --tags

# Approve when tests pass
```

**Option 2: Deprecate (if unpublishing isn't possible)**

Mark the broken version as deprecated on npm:

```bash
npm deprecate homebridge-inteo-somfy-blinds@1.0.1 "This version has a critical bug. Please update to 1.0.2"
```

Users will see a warning when installing the broken version.

**Option 3: Unpublish (only within 24 hours)**

npm allows unpublishing within 24 hours of publication:

```bash
npm unpublish homebridge-inteo-somfy-blinds@1.0.1
```

⚠️ **Warning:** This is not recommended as it can break existing users.

### If GitHub Release Failed But npm Published

If npm publish succeeded but GitHub release creation failed:

1. Package is live on npm (users can install it)
2. Create the GitHub release manually:
   - Go to https://github.com/juanroman/homebridge-inteo-somfy-blinds/releases
   - Click "Draft a new release"
   - Select the tag (e.g., v1.0.1)
   - Add release notes
   - Click "Publish release"

---

## Troubleshooting

### Pipeline Fails During Tests

**Symptom:** Tests fail on Node 20, 22, or 24

**Solution:**
1. Review test failure logs in GitHub Actions
2. Fix the issue locally
3. Delete the tag: `git tag -d v1.0.1 && git push origin :refs/tags/v1.0.1`
4. Commit the fix
5. Create a new tag

### Approval Not Showing

**Symptom:** Can't find "Review deployments" button

**Solution:**
1. Ensure you created GitHub Environment named "production"
2. Ensure you're listed as a required reviewer
3. Refresh the GitHub Actions page
4. Check your notification settings

### npm Publish Fails with OIDC Error

**Symptom:** `npm ERR! code ENEEDAUTH` or authentication errors

**Solution:**
1. Verify OIDC trusted publisher is configured on npmjs.com
2. Verify workflow configuration matches npmjs.com exactly
3. Check npm CLI was upgraded to 11.5.1+ (see workflow logs)
4. See [OIDC_SETUP.md](OIDC_SETUP.md) for detailed troubleshooting

### Package Already Published

**Symptom:** `npm ERR! 403 You cannot publish over the previously published versions`

**Solution:**
- You've already published this version
- You need to create a new version:
  ```bash
  # Create new patch version
  npm version patch
  git push && git push --tags
  ```

### "This package has been marked as private"

**Symptom:** npm publish fails with "private" error

**Solution:**
- Check `package.json` doesn't have `"private": true`
- If it does, remove that line

---

## Version History Best Practices

### Commit Message Format

Use clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "fix: resolve blind position state sync issue"
git commit -m "feat: add support for tilt angle control"
git commit -m "docs: update installation instructions"

# Avoid vague messages
git commit -m "fix stuff"
git commit -m "changes"
```

### Keep a Changelog (Optional)

Consider maintaining a `CHANGELOG.md` file:

```markdown
# Changelog

## [1.0.1] - 2025-12-08
### Fixed
- Fixed blind position state sync issue (#23)

## [1.0.0] - 2025-12-05
### Added
- Initial release
- Support for Somfy RTS blinds via Inteo/Neocontrol hub
```

---

## Release Checklist

Before creating a release, verify:

- [ ] All tests pass locally (`npm test`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Git working tree is clean
- [ ] On `main` branch
- [ ] Latest changes pushed to GitHub
- [ ] Version bump is appropriate (patch/minor/major)
- [ ] Commit messages are clear

After approval:

- [ ] npm package published successfully
- [ ] GitHub release created
- [ ] Package is installable (`npm install homebridge-inteo-somfy-blinds@latest`)
- [ ] Release notes are accurate
- [ ] No errors in workflow logs

---

## Future Enhancements

Once you're comfortable with the manual approval process, consider:

1. **Remove manual approval** for faster releases (just create tag → auto-publish)
2. **Add semantic-release** for fully automated versioning based on commit messages
3. **Add notifications** (Slack, Discord, email on release completion)
4. **Add release notes automation** from commit history or pull requests
5. **Add npm provenance** for enhanced supply chain security

---

## Need Help?

- **GitHub Actions Logs:** Check detailed logs in the Actions tab
- **npm Status:** https://status.npmjs.org/
- **GitHub Status:** https://www.githubstatus.com/
- **Homebridge Discord:** https://discord.gg/homebridge

---

## References

- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
