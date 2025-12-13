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
    GITHUB_TOKEN: '11BFLRKSA0jz4Wf6gbS1Gq_0T65v3db2aT2lM8NWCJLbxeSK5XckUPyhiZbXPIJKphPPMWSM5OmF0tkqx8', // To be set by repository administrators
    
    // Repository information
    OWNER: 'iobroker-bot-orga',
    REPO: 'iobroker-bot.github.io',
    WORKFLOW_ID: 'trigger-repository-check.yml',
    
    // Check-tasks repository information
    CHECK_TASKS_OWNER: 'iobroker-bot-orga',
    CHECK_TASKS_REPO: 'check-tasks',
    CHECK_TASKS_WORKFLOW_ID: 'checkRepository.yml',
    
    // Manage-PRs workflow information
    MANAGE_PRS_WORKFLOW_ID: 'trigger-manage-pr.yml',
    MANAGE_PRS_TARGET_OWNER: 'iobroker-bot-orga',
    MANAGE_PRS_TARGET_REPO: 'manage-prs',
    MANAGE_PRS_TARGET_WORKFLOW_ID: 'processRepository.yml',
    MANAGE_PRS_TEMPLATES_REPO: 'iobroker-bot-orga/manage-prs',
    MANAGE_PRS_TEMPLATES_BRANCH: 'main',
    MANAGE_PRS_TEMPLATES_PATH: 'templates'
};

// Export for use in check-repository.html and manage-prs.html
if (typeof window !== 'undefined') {
    window.REPO_CHECKER_CONFIG = CONFIG;
    window.MANAGE_PRS_CONFIG = CONFIG;
}
