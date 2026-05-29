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
    MANAGE_PRS_TEMPLATES_PATH: 'templates',
    
    // Copy-Issues workflow information
    COPY_ISSUES_WORKFLOW_ID: 'trigger-copy-issues.yml',
    TOOLS_OWNER: 'iobroker-bot-orga',
    TOOLS_REPO: 'tools',
    TOOLS_WORKFLOW_ID: 'copy-issues.yml',
    
    // Dependabot Recreate workflow information
    DEPENDABOT_RECREATE_WORKFLOW_ID: 'trigger-dependabot-recreate.yml',
    DEPENDABOT_RECREATE_TOOLS_WORKFLOW_ID: 'dependabot-recreate.yml',

    // Announcement workflow information
    ANNOUNCEMENT_WORKFLOW_ID: 'trigger-announcement.yml',
    ANNOUNCEMENT_TARGET_OWNER: 'iobroker-bot-orga',
    ANNOUNCEMENT_TARGET_REPO: 'announcements',
    ANNOUNCEMENT_TARGET_WORKFLOW_ID: 'announceRepository.yml',
    ANNOUNCEMENT_TEMPLATES_REPO: 'iobroker-bot-orga/announcements',
    ANNOUNCEMENT_TEMPLATES_BRANCH: 'main',
    ANNOUNCEMENT_TEMPLATES_PATH: 'templates',

    // Authentication configuration
    // Set REQUIRE_AUTH to true to require GitHub authentication to access any page.
    // Set to false to disable the login requirement entirely.
    REQUIRE_AUTH: false,
    // GitHub organization — members of this org are granted access
    AUTH_ORG: 'iobroker-bot-orga',
    // Repository whose outside collaborators are also granted access
    AUTH_REPO: 'iobroker-bot.github.io',
    // Required backend-assisted GitHub login endpoints.
    // These URLs must point to your authentication service (not directly to github.com).
    // Example values:
    // - AUTH_LOGIN_URL: 'https://auth.example.com/github/login'
    // - AUTH_SESSION_URL: 'https://auth.example.com/github/session'
    // - AUTH_LOGOUT_URL: 'https://auth.example.com/github/logout'
    // The backend is expected to expose:
    // - AUTH_LOGIN_URL: starts the GitHub login flow and redirects back
    // - AUTH_SESSION_URL: returns { authenticated: true, user: { login, avatar_url } }
    // - AUTH_LOGOUT_URL: clears the backend session and redirects back
    AUTH_LOGIN_URL: '',
    AUTH_SESSION_URL: '',
    AUTH_LOGOUT_URL: ''
};

// Export for use in check-repository.html, manage-prs.html, copy-issues.html, and dependabot-recreate.html
if (typeof window !== 'undefined') {
    window.REPO_CHECKER_CONFIG = CONFIG;
    window.MANAGE_PRS_CONFIG = CONFIG;
    window.COPY_ISSUES_CONFIG = CONFIG;
    window.DEPENDABOT_RECREATE_CONFIG = CONFIG;
    window.ANNOUNCEMENT_CONFIG = CONFIG;
    window.AUTH_CONFIG = CONFIG;
}
