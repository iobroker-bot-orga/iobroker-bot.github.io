# Backend Integration Guide

## Repository Checker Workflow Trigger

The Repository Checker form (`check-repository.html`) requires a backend service to securely trigger the GitHub Actions workflow.

### Why Backend is Needed

GitHub's workflow dispatch API requires authentication with a Personal Access Token (PAT) or GitHub App credentials. These cannot be securely stored in client-side JavaScript.

### Implementation Options

#### Option 1: Serverless Function (Recommended)

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

#### Option 2: GitHub App

Create a GitHub App with `workflow_dispatch` permissions that:

1. Handles OAuth authentication
2. Triggers workflows on behalf of the authenticated user

### Workflow Details

**Target Workflow**: `https://github.com/iobroker-bot-orga/check-tasks/blob/main/.github/workflows/checkRepository.yml`

**Trigger Method**: `workflow_dispatch` or `repository_dispatch`

**Required Inputs**:
- `repository`: The repository identifier (owner/repo format)

**Optional Parameters**:
- `--recreate`: Pass this flag to the checkRepository.js script to force creation of a new issue

### API Integration Example

```javascript
// Backend serverless function example
async function triggerCheck(repository, recreate) {
  const response = await fetch(
    'https://api.github.com/repos/iobroker-bot-orga/check-tasks/actions/workflows/checkRepository.yml/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          repository: repository
        }
      })
    }
  );
  
  return response;
}
```

**Note**: The `--recreate` flag would need to be handled by extending the workflow's input parameters to include a `recreate` boolean input.

### Current Implementation Status

The current frontend implementation:
- ✅ Validates repository input (supports both URL and owner/repo formats)
- ✅ Provides UI for recreate option
- ✅ Handles form submission
- ⚠️ Requires backend integration to actually trigger the workflow

### Next Steps

1. Set up a backend service (serverless function recommended)
2. Add the API endpoint URL to the frontend configuration
3. Update `check-repository.html` to call the backend API instead of showing the demo message
4. Optionally: Update the workflow to accept a `recreate` input parameter
