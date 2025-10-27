# Setup Guide for Repository Checker

This guide explains how to configure the repository checker to work with GitHub Actions.

## Architecture Overview

The repository checker uses a two-tier workflow approach for security:

1. **Frontend (check-repository.html)** - Uses a public PAT with limited permissions to trigger workflows only in this repository
2. **Workflow (trigger-repository-check.yml)** - Uses a secure PAT stored as a repository secret to trigger the actual check workflow

This approach ensures that:
- The public token has minimal permissions (only trigger workflows in this repo)
- The secure token with broader permissions is never exposed to the client
- The workflow acts as a secure proxy between the frontend and the check-tasks repository

## Setup Instructions

### Step 1: Create WORKFLOW_TRIGGER_TOKEN (Repository Secret)

This token is used by the workflow to trigger the check workflow in the check-tasks repository.

**For the iobroker-bot user, create a Personal Access Token with these settings:**

#### Option A: Fine-grained Personal Access Token (Recommended)

1. Go to: https://github.com/settings/personal-access-tokens/new
2. Configure the token:
   - **Token name**: `workflow-trigger-token`
   - **Expiration**: Choose appropriate expiration (90 days recommended, can be renewed)
   - **Repository access**: Select "Only select repositories"
     - Choose: `iobroker-bot-orga/check-tasks`
   - **Repository permissions**:
     - **Actions**: Read and write access
     - **Contents**: Read-only access (for workflow file access)
     - **Metadata**: Read-only (automatically included)

3. Click "Generate token"
4. Copy the token (it starts with `github_pat_`)

#### Option B: Classic Personal Access Token (Alternative)

1. Go to: https://github.com/settings/tokens/new
2. Configure the token:
   - **Note**: `workflow-trigger-token`
   - **Expiration**: Choose appropriate expiration
   - **Select scopes**:
     - [x] `repo` (Full control of private repositories)
       - This includes `public_repo` which is needed for triggering workflows
   
   **Note**: Classic tokens have broader permissions. Fine-grained tokens are preferred for better security.

3. Click "Generate token"
4. Copy the token (it starts with `ghp_`)

#### Add the token as a repository secret:

1. Go to: https://github.com/iobroker-bot-orga/iobroker-bot.github.io/settings/secrets/actions
2. Click "New repository secret"
3. Name: `WORKFLOW_TRIGGER_TOKEN`
4. Value: Paste the token you created above
5. Click "Add secret"

### Step 2: Create PUBLIC_WORKFLOW_TOKEN (Public Configuration)

This token is used by the frontend to trigger the workflow in this repository. It has very limited permissions.

**For the iobroker-bot user, create a second Personal Access Token:**

#### Fine-grained Personal Access Token (Recommended)

1. Go to: https://github.com/settings/personal-access-tokens/new
2. Configure the token:
   - **Token name**: `public-workflow-trigger`
   - **Expiration**: Choose appropriate expiration
   - **Repository access**: Select "Only select repositories"
     - Choose: `iobroker-bot-orga/iobroker-bot.github.io`
   - **Repository permissions**:
     - **Actions**: Read and write access (needed to trigger workflow_dispatch)
     - **Metadata**: Read-only (automatically included)

3. Click "Generate token"
4. Copy the token

#### Add the token to config.js:

1. Open `config.js` in this repository
2. Replace the empty `GITHUB_TOKEN` value with your token:
   ```javascript
   GITHUB_TOKEN: 'github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
   ```
3. Commit and push the change

**Security Note**: This token is public and visible to anyone. This is acceptable because:
- It only has permission to trigger workflows in this repository
- It cannot access any other repositories or resources
- The actual sensitive token is stored securely as a repository secret
- Even if compromised, the worst case is someone triggers extra workflow runs

### Step 3: Verify the Setup

1. Navigate to: https://iobroker-bot-orga.github.io/iobroker-bot.github.io/check-repository.html
2. Enter a test repository (e.g., `iobroker-community-adapters/ioBroker.template`)
3. Click "Execute"
4. Check for success message
5. Verify the workflow runs:
   - Check: https://github.com/iobroker-bot-orga/iobroker-bot.github.io/actions
   - Look for "Trigger Repository Check" workflow run
   - Check: https://github.com/iobroker-bot-orga/check-tasks/actions
   - Look for "Check repository" workflow run

## Token Management

### Token Expiration

Both tokens will expire based on the expiration period you set. When a token expires:

1. **WORKFLOW_TRIGGER_TOKEN expiration**: The workflow will fail to trigger the check-tasks workflow
2. **PUBLIC_WORKFLOW_TOKEN expiration**: The frontend will fail to trigger the workflow

To renew:
- Generate a new token with the same permissions
- Update the repository secret or config.js accordingly

### Token Revocation

If either token is compromised or no longer needed:

1. Go to: https://github.com/settings/tokens
2. Find the token in the list
3. Click "Delete" or "Revoke"
4. Generate a new token if needed and update the configuration

## Troubleshooting

### "Configuration incomplete: GitHub token not set"
- The `config.js` file hasn't been updated with the PUBLIC_WORKFLOW_TOKEN
- Solution: Follow Step 2 above

### "Authentication failed: Invalid or expired GitHub token"
- The PUBLIC_WORKFLOW_TOKEN in config.js is invalid or expired
- Solution: Generate a new token and update config.js

### Workflow triggers but check-tasks workflow doesn't run
- The WORKFLOW_TRIGGER_TOKEN secret is missing, invalid, or expired
- Solution: Check repository secrets and regenerate if needed

### "Workflow not found"
- The workflow file doesn't exist or is not in the main branch
- Solution: Ensure `.github/workflows/trigger-repository-check.yml` exists

## Security Considerations

1. **Public Token Security**: The PUBLIC_WORKFLOW_TOKEN is intentionally public but has minimal permissions
2. **Secret Token Security**: The WORKFLOW_TRIGGER_TOKEN must never be exposed in client-side code
3. **Token Rotation**: Regularly rotate both tokens (recommended every 90 days)
4. **Permission Principle**: Both tokens follow the principle of least privilege
5. **Audit Trail**: All workflow triggers are logged in GitHub Actions for auditing

## Alternative Approaches

If you prefer not to use public tokens, consider:

1. **GitHub Apps**: Create a GitHub App with OAuth flow for user authentication
2. **Backend Service**: Deploy a serverless function that handles authentication server-side
3. **GitHub Actions Only**: Manually trigger workflows from the GitHub Actions UI

The current approach balances security, simplicity, and functionality for GitHub Pages deployment.
