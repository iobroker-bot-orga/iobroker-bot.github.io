/**
 * Authentication module for ioBroker Bot GitHub Pages
 *
 * Protects all pages with GitHub authentication.
 * Access is granted to members of the configured GitHub organization or
 * outside collaborators of the configured repository.
 *
 * Authentication state is stored in browser storage so it can survive browser
 * restarts. Optionally, a backend-managed GitHub login session can be used.
 *
 * To enable or disable authentication, set REQUIRE_AUTH in config.js.
 */
(function () {
    'use strict';

    const TOKEN_KEY = 'iobroker_auth_token';
    const USER_KEY  = 'iobroker_auth_user';
    const MODE_KEY  = 'iobroker_auth_mode';

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
    // Storage helpers
    // ---------------------------------------------------------------------------

    function getPersistentStorage() {
        try {
            return window.localStorage;
        } catch (e) {
            return null;
        }
    }

    function getSessionStorage() {
        try {
            return window.sessionStorage;
        } catch (e) {
            return null;
        }
    }

    function getStoredValue(key) {
        const persistentStorage = getPersistentStorage();
        if (persistentStorage) {
            const value = persistentStorage.getItem(key);
            if (value !== null) {
                return value;
            }
        }

        const sessionStorageRef = getSessionStorage();
        return sessionStorageRef ? sessionStorageRef.getItem(key) : null;
    }

    function setStoredValue(key, value, persist) {
        clearStoredValue(key);

        const preferredStorage = persist !== false ? getPersistentStorage() : getSessionStorage();
        const fallbackStorage  = persist !== false ? getSessionStorage() : getPersistentStorage();

        if (preferredStorage) {
            preferredStorage.setItem(key, value);
            return;
        }
        if (fallbackStorage) {
            fallbackStorage.setItem(key, value);
        }
    }

    function clearStoredValue(key) {
        const persistentStorage = getPersistentStorage();
        const sessionStorageRef = getSessionStorage();

        if (persistentStorage) {
            persistentStorage.removeItem(key);
        }
        if (sessionStorageRef) {
            sessionStorageRef.removeItem(key);
        }
    }

    function getAuthToken() {
        return getStoredValue(TOKEN_KEY);
    }

    function getAuthUser() {
        try {
            const raw = getStoredValue(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function getAuthMode() {
        return getStoredValue(MODE_KEY);
    }

    function setAuth(token, user, options) {
        const normalizedOptions = typeof options === 'boolean'
            ? { persist: options, mode: 'pat' }
            : (options || {});
        const persist = normalizedOptions.persist !== false;
        const mode    = normalizedOptions.mode || 'pat';

        if (typeof token === 'string' && token) {
            setStoredValue(TOKEN_KEY, token, persist);
        } else {
            clearStoredValue(TOKEN_KEY);
        }
        setStoredValue(USER_KEY, JSON.stringify(user), persist);
        setStoredValue(MODE_KEY, mode, persist);
    }

    function clearAuth() {
        clearStoredValue(TOKEN_KEY);
        clearStoredValue(USER_KEY);
        clearStoredValue(MODE_KEY);
    }

    function getRedirectTarget() {
        const params = new URLSearchParams(window.location.search);
        const raw    = params.get('redirect') || 'index.html';
        const allowedPages = [
            'index.html',
            'check-repository.html',
            'manage-prs.html',
            'announcement.html',
            'copy-issues.html',
            'dependabot-recreate.html'
        ];
        const filename = raw.split('/').pop().split('?')[0];
        return allowedPages.includes(filename) ? filename : 'index.html';
    }

    function getLoginUrl(redirectTarget) {
        const config = getConfig();
        if (!config || !config.AUTH_LOGIN_URL) {
            return null;
        }

        const loginUrl = new URL(config.AUTH_LOGIN_URL, window.location.href);
        if (!loginUrl.searchParams.has('redirect')) {
            loginUrl.searchParams.set(
                'redirect',
                new URL(redirectTarget || getRedirectTarget(), window.location.href).toString()
            );
        }
        return loginUrl.toString();
    }

    async function fetchSession() {
        const config = getConfig();
        if (!config || !config.AUTH_SESSION_URL) {
            return { success: false, error: 'Session authentication is not configured.' };
        }

        let response;
        try {
            response = await fetch(config.AUTH_SESSION_URL, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
        } catch (e) {
            return { success: false, error: 'Could not reach the authentication service. Please try again.' };
        }

        if (response.status === 401) {
            return { success: false, error: 'No active GitHub session found.' };
        }
        if (!response.ok) {
            return { success: false, error: 'Failed to verify the current session (HTTP ' + response.status + ').' };
        }

        let payload;
        try {
            payload = await response.json();
        } catch (e) {
            return { success: false, error: 'Authentication service returned an invalid response.' };
        }

        if (payload && payload.authenticated === true && payload.user && payload.user.login) {
            return { success: true, user: payload.user };
        }

        return {
            success: false,
            error: payload && payload.error ? payload.error : 'No active GitHub session found.'
        };
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
        const config = getConfig();
        const logoutUrl = config && config.AUTH_LOGOUT_URL ? config.AUTH_LOGOUT_URL : null;
        const loginUrl  = new URL('login.html', window.location.href).toString();

        clearAuth();
        if (logoutUrl) {
            const url = new URL(logoutUrl, window.location.href);
            if (!url.searchParams.has('redirect')) {
                url.searchParams.set('redirect', loginUrl);
            }
            window.location.href = url.toString();
            return;
        }
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

    async function initAuth() {
        const config = getConfig();
        if (!config) {
            // config.js hasn't been loaded yet — retry after DOM is ready
            return;
        }

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage === 'login.html') {
            return;
        }

        const requireAuth = config.REQUIRE_AUTH;
        const mode        = getAuthMode();

        if (mode === 'session' && config.AUTH_SESSION_URL) {
            const sessionResult = await fetchSession();
            if (sessionResult.success) {
                setAuth('', sessionResult.user, { mode: 'session', persist: true });
            } else {
                clearAuth();
            }
        }

        const currentUser = getAuthUser();
        const currentMode = getAuthMode();
        const currentToken = getAuthToken();

        if (requireAuth && (!currentUser || (currentMode !== 'session' && !currentToken))) {
            // Not authenticated — redirect to the login page, preserving the
            // originally requested page so we can redirect back after login.
            const requestedPage = currentPage + window.location.search;
            window.location.replace('login.html?redirect=' + encodeURIComponent(requestedPage));
            return;
        }

        // Render the persistent auth bar so the user can see who they are and log out
        if (currentUser) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { renderAuthBar(currentUser); });
            } else {
                renderAuthBar(currentUser);
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    window.AUTH = {
        getAuthToken:  getAuthToken,
        getAuthUser:   getAuthUser,
        getAuthMode:   getAuthMode,
        setAuth:       setAuth,
        clearAuth:     clearAuth,
        getRedirectTarget: getRedirectTarget,
        getLoginUrl:   getLoginUrl,
        fetchSession:  fetchSession,
        verifyAccess:  verifyAccess,
        logout:        logout,
        renderAuthBar: renderAuthBar
    };

    // Run immediately — config.js must be loaded before auth.js in every page
    initAuth();
}());
