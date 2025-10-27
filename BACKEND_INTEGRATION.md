# Backend Integration Guide

## Repository Checker Workflow Trigger

The Repository Checker form (`check-repository.html`) now uses a two-tier GitHub Actions workflow approach to securely trigger repository checks.

## Current Implementation

### Architecture

The implementation uses two GitHub Personal Access Tokens with different permission levels:

1. **PUBLIC_WORKFLOW_TOKEN** (in `config.js`)
   - Public token visible in the source code
   - **Permissions**: Only trigger workflows in `iobroker-bot-orga/iobroker-bot.github.io`
   - Used by the frontend to trigger the proxy workflow

2. **WORKFLOW_TRIGGER_TOKEN** (repository secret)
   - Secure token stored as a GitHub repository secret
   - **Permissions**: Trigger workflows in `iobroker-bot-orga/check-tasks`
   - Used by the workflow to trigger the actual check workflow

### How It Works

1. User submits the form on the GitHub Pages site
2. Frontend calls GitHub API to trigger `trigger-repository-check.yml` workflow in this repo
3. Workflow validates input and triggers `checkRepository.yml` in check-tasks repo
4. Repository check runs and creates/updates issues as needed

### Security Benefits

- Public token has minimal permissions (can only trigger workflows in this repo)
- Secure token with broader permissions never exposed to clients
- Workflow acts as a secure proxy between frontend and check-tasks
- All workflow triggers are logged in GitHub Actions for auditing

## Setup Instructions

See [SETUP.md](SETUP.md) for detailed setup instructions including:
- Creating the WORKFLOW_TRIGGER_TOKEN (repository secret)
- Creating the PUBLIC_WORKFLOW_TOKEN (public configuration)
- Token permissions and security considerations
- Troubleshooting guide

## Alternative Implementation Options

If you prefer not to use this approach, other options include:

### Option 1: Serverless Function

Create a serverless function (e.g., Vercel, Netlify Functions, AWS Lambda) that:

1. Receives the form data (repository, recreate flag)
2. Validates the input
3. Triggers the workflow using GitHub's API

Example endpoint structure:
```
POST /api/trigger-check
Body: {
  "repository": "owner/repo",
  "recreate": false
}
```

### Option 2: GitHub App

Create a GitHub App with `actions:write` permissions that:

1. Handles OAuth authentication
2. Triggers workflows on behalf of the authenticated user

## Workflow Details

**Proxy Workflow**: `.github/workflows/trigger-repository-check.yml` in this repository

**Target Workflow**: `https://github.com/iobroker-bot-orga/check-tasks/blob/main/.github/workflows/checkRepository.yml`

**Trigger Method**: `workflow_dispatch`

**Required Inputs**:
- `repository`: The repository identifier (owner/repo format)
- `recreate`: Boolean to force creation of a new issue (optional)

## Current Implementation Status

- ✅ Frontend validates repository input (supports both URL and owner/repo formats)
- ✅ Frontend provides UI for recreate option
- ✅ Frontend triggers proxy workflow in this repository
- ✅ Proxy workflow validates input and triggers check workflow
- ✅ Secure token management using repository secrets
- ⚠️ Requires setup of both tokens (see SETUP.md)

## Token Management

Both tokens will expire based on their expiration period. See [SETUP.md](SETUP.md) for token renewal and management procedures.

