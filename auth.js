/**
 * Authentication module for ioBroker Bot GitHub Pages
 *
 * Protects all pages with GitHub Personal Access Token (PAT) authentication.
 * Access is granted to members of the configured GitHub organization or
 * outside collaborators of the configured repository.
 *
 * Authentication state is stored in sessionStorage and is cleared when the
 * browser tab / session ends.
 *
 * To enable or disable authentication, set REQUIRE_AUTH in config.js.
 */
(function () {
    'use strict';

    const TOKEN_KEY = 'iobroker_auth_token';
    const USER_KEY  = 'iobroker_auth_user';

    // ---------------------------------------------------------------------------
    // Config helpers
    // ---------------------------------------------------------------------------

    function getConfig() {
        return window.AUTH_CONFIG ||
               window.REPO_CHECKER_CONFIG ||
               window.MANAGE_PRS_CONFIG ||
               window.COPY_ISSUES_CONFIG ||
               window.DEPENDABOT_RECREATE_CONFIG ||
               window.ANNOUNCEMENT_CONFIG ||
               null;
    }

    // ---------------------------------------------------------------------------
    // Session storage helpers
    // ---------------------------------------------------------------------------

    function getAuthToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function getAuthUser() {
        try {
            const raw = sessionStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function setAuth(token, user) {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearAuth() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    }

    // ---------------------------------------------------------------------------
    // Access verification  (called from login.html)
    // ---------------------------------------------------------------------------

    /**
     * Validates a GitHub PAT and checks whether the authenticated user is
     * permitted to access the site (org member or repository collaborator).
     *
     * @param {string} token  GitHub Personal Access Token
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async function verifyAccess(token) {
        const config = getConfig();
        if (!config) {
            return { success: false, error: 'Configuration not loaded. Please refresh the page.' };
        }

        const authOrg  = config.AUTH_ORG;
        const authRepo = config.AUTH_REPO;

        // Step 1 – validate token and retrieve user info
        let userResponse;
        try {
            userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
        } catch (e) {
            return { success: false, error: 'Network error while contacting GitHub API. Please try again.' };
        }

        if (userResponse.status === 401) {
            return { success: false, error: 'Invalid or expired GitHub token.' };
        }
        if (!userResponse.ok) {
            return { success: false, error: 'Failed to validate token (HTTP ' + userResponse.status + ').' };
        }

        const user     = await userResponse.json();
        const username = user.login;

        // Step 2 – check organization membership
        try {
            const orgResponse = await fetch(
                'https://api.github.com/orgs/' + encodeURIComponent(authOrg) +
                '/members/' + encodeURIComponent(username),
                {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            if (orgResponse.status === 204) {
                return { success: true, user: user };
            }
        } catch (e) {
            // fall through to collaborator check
        }

        // Step 3 – check repository collaborator access (covers outside collaborators)
        try {
            const collabResponse = await fetch(
                'https://api.github.com/repos/' +
                encodeURIComponent(authOrg) + '/' + encodeURIComponent(authRepo) +
                '/collaborators/' + encodeURIComponent(username),
                {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            if (collabResponse.status === 204) {
                return { success: true, user: user };
            }
        } catch (e) {
            // fall through to denial
        }

        return {
            success: false,
            user: user,
            error: 'Access denied. You must be a member of the "' + authOrg +
                   '" organization or an outside collaborator of the repository to use these tools.'
        };
    }

    // ---------------------------------------------------------------------------
    // Logout
    // ---------------------------------------------------------------------------

    function logout() {
        clearAuth();
        window.location.href = 'login.html';
    }

    // ---------------------------------------------------------------------------
    // Auth bar (shown on protected pages when the user is logged in)
    // ---------------------------------------------------------------------------

    function renderAuthBar(user) {
        if (!user || document.getElementById('auth-bar')) {
            return;
        }

        const bar = document.createElement('div');
        bar.id = 'auth-bar';
        bar.setAttribute('aria-label', 'Logged in as ' + user.login);
        bar.style.cssText = [
            'position:fixed',
            'top:0',
            'right:0',
            'background:rgba(0,0,0,0.72)',
            'color:#fff',
            'padding:5px 14px',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
            'font-size:13px',
            'border-radius:0 0 0 8px',
            'display:flex',
            'align-items:center',
            'gap:8px',
            'z-index:10000',
            'box-shadow:0 2px 8px rgba(0,0,0,0.3)'
        ].join(';');

        // Avatar
        const avatar = document.createElement('img');
        avatar.src    = user.avatar_url || '';
        avatar.alt    = '';
        avatar.width  = 20;
        avatar.height = 20;
        avatar.style.cssText = 'border-radius:50%;vertical-align:middle;';

        // Username
        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.login;

        // Logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.cssText = [
            'background:rgba(255,255,255,0.18)',
            'border:1px solid rgba(255,255,255,0.45)',
            'color:#fff',
            'padding:2px 9px',
            'border-radius:4px',
            'cursor:pointer',
            'font-size:12px',
            'font-family:inherit'
        ].join(';');
        logoutBtn.addEventListener('click', logout);

        bar.appendChild(avatar);
        bar.appendChild(nameSpan);
        bar.appendChild(logoutBtn);
        document.body.appendChild(bar);
    }

    // ---------------------------------------------------------------------------
    // Init — called automatically when the script is loaded
    // ---------------------------------------------------------------------------

    function initAuth() {
        const config = getConfig();
        if (!config) {
            // config.js hasn't been loaded yet — retry after DOM is ready
            return;
        }

        const requireAuth = config.REQUIRE_AUTH;
        const token       = getAuthToken();
        const user        = getAuthUser();

        if (requireAuth && (!token || !user)) {
            // Not authenticated — redirect to the login page, preserving the
            // originally requested page so we can redirect back after login.
            const currentPage = (window.location.pathname.split('/').pop() || 'index.html') +
                                 window.location.search;
            window.location.replace('login.html?redirect=' + encodeURIComponent(currentPage));
            return;
        }

        // Render the persistent auth bar so the user can see who they are and log out
        if (user) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { renderAuthBar(user); });
            } else {
                renderAuthBar(user);
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    window.AUTH = {
        getAuthToken:  getAuthToken,
        getAuthUser:   getAuthUser,
        setAuth:       setAuth,
        clearAuth:     clearAuth,
        verifyAccess:  verifyAccess,
        logout:        logout,
        renderAuthBar: renderAuthBar
    };

    // Run immediately — config.js must be loaded before auth.js in every page
    initAuth();
}());
