// Configuration for GitHub Actions workflow triggering
// This file contains the public PAT that only has permission to trigger workflows in this repository

const CONFIG = {
    // This token should be a GitHub Personal Access Token (classic or fine-grained) with ONLY:
    // - Repository: iobroker-bot-orga/iobroker-bot.github.io
    // - Permission: actions:write (or workflow permission for fine-grained tokens)
    // 
    // IMPORTANT: This token is PUBLIC and should ONLY have permission to trigger workflows
    // in the iobroker-bot.github.io repository. It should NOT have any other permissions.
    // 
    // The actual token that triggers the check-tasks workflow is stored securely
    // as a secret (WORKFLOW_TRIGGER_TOKEN) in this repository's settings.
    GITHUB_TOKEN: '', // To be set by repository administrators
    
    // Repository information
    OWNER: 'iobroker-bot-orga',
    REPO: 'iobroker-bot.github.io',
    WORKFLOW_ID: 'trigger-repository-check.yml'
};

// Export for use in check-repository.html
if (typeof window !== 'undefined') {
    window.REPO_CHECKER_CONFIG = CONFIG;
}
