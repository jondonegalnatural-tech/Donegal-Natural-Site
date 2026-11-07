// =============================================
// Donegal Natural - Login Portal JavaScript
// Supabase Auth only
// =============================================

// ================== SUPABASE CLIENT ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =====================================================

// Clear spoofed / stale currentUser when there is no live session
(async function clearStaleUserCache() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            localStorage.removeItem('currentUser');
        }
    } catch (_) {
        localStorage.removeItem('currentUser');
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.classList.add('hidden');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            showError("Please enter both email and password.", {
                email: username,
                step: 'missing_fields',
                summary: 'Email or password was left blank.'
            });
            return;
        }

        // Require an email address
        if (!username.includes('@')) {
            showError("Please enter your email address (not a username).", {
                step: 'not_an_email',
                summary: 'They entered a username instead of an email address.'
            });
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: username,
                password: password
            });

            if (error) {
                const message = String(error.message || '');
                let step = 'login_failed';
                let summary = 'Sign-in stopped before a session started.';
                let shown = message || 'Login failed. Please try again.';
                if (/email not confirmed/i.test(message)) {
                    step = 'email_not_confirmed';
                    summary = 'The email address is not confirmed yet.';
                    shown = 'This email is not confirmed yet. Read Donegal the code below.';
                } else if (/too many|rate limit/i.test(message)) {
                    step = 'rate_limited';
                    summary = 'Too many sign-in attempts.';
                    shown = 'Too many attempts. Wait a few minutes, then try again.';
                } else if (/invalid login|invalid credentials/i.test(message)) {
                    step = 'invalid_credentials';
                    summary = 'Password was not accepted.';
                    shown = 'That email and password were not accepted. Use Forgot password, or read Donegal the code below.';
                }
                showError(shown, {
                    email: username,
                    step: step,
                    summary: summary,
                    httpStatus: error.status
                });
                return;
            }

            if (!data.session?.access_token || !data.session?.refresh_token || !data.user?.id) {
                showError("Login could not start a session. Please try again.", {
                    email: username,
                    step: 'no_session',
                    summary: 'Password was accepted, but no session was returned.'
                });
                return;
            }

            // Password login can succeed while the next request still goes out as
            // the anonymous key. Read the profile with this sign-in's token, then
            // store that same session so the portal does not bounce them back.
            const storedSession = await supabaseClient.auth.getSession();
            let activeSession = storedSession.data?.session?.user?.id === data.user.id
                ? storedSession.data.session
                : null;
            if (!activeSession) {
                const { data: restored, error: restoreError } = await supabaseClient.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                });
                if (restoreError || restored?.session?.user?.id !== data.user.id) {
                    console.error('Could not store login session', restoreError);
                    try { await supabaseClient.auth.signOut(); } catch (_) {}
                    showError("Login could not start a session. Please try again.", {
                        email: username,
                        step: 'session_store_failed',
                        summary: 'Password was accepted, but the browser did not keep the session.'
                    });
                    return;
                }
                activeSession = restored.session;
            }

            let profile = null;
            let profileStatus = 0;
            for (let attempt = 0; attempt < 2; attempt++) {
                const profileRes = await fetch(
                    SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(data.user.id) + '&select=*',
                    {
                        headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: 'Bearer ' + activeSession.access_token,
                            Accept: 'application/json'
                        }
                    }
                );
                profileStatus = profileRes.status;
                if (profileRes.ok) {
                    const rows = await profileRes.json();
                    profile = Array.isArray(rows) ? rows[0] : null;
                    if (profile) break;
                }
                if (attempt === 0) {
                    await new Promise(function (resolve) { setTimeout(resolve, 400); });
                }
            }

            if (!profile) {
                console.error('Profile lookup failed after sign-in', profileStatus, data.user.id);
                try { await supabaseClient.auth.signOut(); } catch (_) {}
                showError("Login succeeded but profile not found. Contact an administrator.", {
                    email: username,
                    step: 'profile_not_found',
                    summary: 'Password was accepted, but the profile read failed.',
                    httpStatus: profileStatus
                });
                return;
            }

            // Decide whether password change is still required
            let mustChange = !!profile.must_change_password;

            // Safety net: if customer already set permanent password,
            // do not force the modal again (profiles update is blocked by RLS)
            if (mustChange && profile.role === 'customer') {
                try {
                    const { data: cust } = await supabaseClient
                        .from('customers')
                        .select('password_changed')
                        .ilike('email', profile.email)
                        .maybeSingle();
                    if (cust && cust.password_changed === true) {
                        mustChange = false;
                    }
                } catch (e) {
                    console.warn('password_changed check failed:', e);
                }
            }

            // Save session in the shape the rest of the app expects
            localStorage.setItem('currentUser', JSON.stringify({
                id: profile.id,
                username: profile.email,
                fullName: profile.full_name || profile.email,
                role: profile.role,
                company: profile.company || '',
                email: profile.email,
                mustChangePassword: mustChange,
                loginTime: new Date().toISOString(),
                supabase: true
            }));

            // Record last login for customers (best-effort; await so redirect does not abort the request)
            if (profile.role === 'customer' && profile.email) {
                try {
                    const now = new Date().toISOString();
                    const { data: existingRows, error: existingErr } = await supabaseClient
                        .from('customers')
                        .select('id, last_login_at')
                        .ilike('email', profile.email);
                    if (existingErr) {
                        console.warn('customer login lookup failed:', existingErr.message || existingErr);
                    }
                    const patch = { last_login_at: now };
                    const { error: lastLoginError } = await supabaseClient
                        .from('customers')
                        .update(patch)
                        .ilike('email', profile.email);
                    if (lastLoginError) {
                        console.warn('last_login_at update failed:', lastLoginError.message || lastLoginError);
                    }
                } catch (e) {
                    console.warn('last_login_at update skipped:', e?.message || e);
                }
            }

            // Record last login for salesmen (best-effort; await so redirect does not abort the request)
            if (profile.role === 'salesman' && profile.email) {
                try {
                    const { error: lastLoginError } = await supabaseClient
                        .from('salesmen')
                        .update({ last_login_at: new Date().toISOString() })
                        .ilike('email', profile.email);
                    if (lastLoginError) {
                        console.warn('salesmen last_login_at update failed:', lastLoginError.message || lastLoginError);
                    }
                } catch (e) {
                    console.warn('salesmen last_login_at update skipped:', e?.message || e);
                }
            }

            // Redirect based on role
            if (profile.role === "customer") {
                window.location.href = "wholesale-portal.html";
            } else if (profile.role === "salesman") {
                window.location.href = "salesman-portal.html";
            } else if (profile.role === "admin") {
                window.location.href = "internal-portal.html";
            } else {
                showError("Unknown role. Contact an administrator.", {
                    email: profile.email || username,
                    step: 'unknown_role',
                    summary: 'The account signed in, but it has no portal role.'
                });
            }
        } catch (err) {
            console.error(err);
            showError("Login failed. Please try again.", {
                email: username,
                step: 'login_failed',
                summary: 'Sign-in stopped unexpectedly.'
            });
        }
    });

    const errorCode = document.getElementById('errorCode');
    document.getElementById('errorDismiss')?.addEventListener('click', function () {
        errorMessage.classList.add('hidden');
    });

    function showError(message, event) {
        const code = window.makeSupportCode ? window.makeSupportCode() : '';
        errorText.textContent = message;
        if (errorCode) errorCode.textContent = code ? ('Please email Donegal support at support@donegalnatural.com with this code for assistance: ' + code) : '';
        errorMessage.classList.remove('hidden');
        if (event && code && window.recordSupportEvent) {
            window.recordSupportEvent(supabaseClient, {
                code: code,
                email: event.email || '',
                step: event.step,
                summary: event.summary,
                httpStatus: event.httpStatus
            });
        }
    }

    (function showReturnedHelpCode() {
        const code = (new URLSearchParams(window.location.search).get('help') || '').toUpperCase();
        if (!/^L-[A-Z2-9]{4}$/.test(code)) return;
        errorText.textContent = 'The wholesale portal sent you back to the login page.';
        if (errorCode) errorCode.textContent = 'Please email Donegal support at support@donegalnatural.com with this code for assistance: ' + code;
        errorMessage.classList.remove('hidden');
    })();

    // ========== FORGOT PASSWORD ==========
    const forgotBtn = document.getElementById('forgot-password-btn');
    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotClose = document.getElementById('forgot-password-close');
    const forgotSendBtn = document.getElementById('forgot-send-btn');
    const forgotEmail = document.getElementById('forgot-email');
    const forgotMessage = document.getElementById('forgot-message');

    const setPasswordModal = document.getElementById('set-password-modal');
    const setPasswordBtn = document.getElementById('set-password-btn');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    const setPasswordMessage = document.getElementById('set-password-message');

    function showForgotMessage(text, isError) {
        if (!forgotMessage) return;
        forgotMessage.textContent = text;
        forgotMessage.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border-red-200', 'bg-green-50', 'text-green-800', 'border-green-200');
        if (isError) {
            forgotMessage.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
        } else {
            forgotMessage.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
        }
    }

    function showSetPasswordMessage(text, isError) {
        if (!setPasswordMessage) return;
        setPasswordMessage.textContent = text;
        setPasswordMessage.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border-red-200', 'bg-green-50', 'text-green-800', 'border-green-200');
        if (isError) {
            setPasswordMessage.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
        } else {
            setPasswordMessage.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
        }
    }

    if (forgotBtn && forgotModal) {
        forgotBtn.addEventListener('click', function () {
            if (forgotEmail) forgotEmail.value = (document.getElementById('username')?.value || '').trim();
            if (forgotMessage) forgotMessage.classList.add('hidden');
            forgotModal.classList.remove('hidden');
        });
    }

    if (forgotClose && forgotModal) {
        forgotClose.addEventListener('click', function () {
            forgotModal.classList.add('hidden');
        });
    }

    if (forgotModal) {
        forgotModal.addEventListener('click', function (e) {
            if (e.target === forgotModal) forgotModal.classList.add('hidden');
        });
    }

    if (forgotSendBtn) {
        forgotSendBtn.addEventListener('click', async function () {
            const email = (forgotEmail?.value || '').trim();
            if (!email || !email.includes('@')) {
                showForgotMessage('Please enter a valid email address.', true);
                return;
            }

            forgotSendBtn.disabled = true;
            forgotSendBtn.textContent = 'Sending…';

            try {
                const redirectTo = window.location.origin + '/login-portal.html';
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectTo
                });

                if (error) {
                    const code = window.makeSupportCode ? window.makeSupportCode() : '';
                    if (code && window.recordSupportEvent) {
                        window.recordSupportEvent(supabaseClient, {
                            code: code,
                            email: email,
                            step: 'password_reset_failed',
                            summary: 'Password reset email could not be sent.',
                            httpStatus: error.status
                        });
                    }
                    showForgotMessage(
                        (error.message || 'Could not send reset email.') +
                        (code ? (' Please email Donegal support at support@donegalnatural.com with this code for assistance: ' + code) : ''),
                        true
                    );
                } else {
                    showForgotMessage('If an account exists for that email, a reset link has been sent. Check your inbox (and spam).', false);
                }
            } catch (err) {
                console.error(err);
                const code = window.makeSupportCode ? window.makeSupportCode() : '';
                if (code && window.recordSupportEvent) {
                    window.recordSupportEvent(supabaseClient, {
                        code: code,
                        email: email,
                        step: 'password_reset_failed',
                        summary: 'Password reset email could not be sent.'
                    });
                }
                showForgotMessage('Something went wrong. Please try again.' + (code ? (' Please email Donegal support at support@donegalnatural.com with this code for assistance: ' + code) : ''), true);
            } finally {
                forgotSendBtn.disabled = false;
                forgotSendBtn.textContent = 'Send reset link';
            }
        });
    }

    // Detect recovery session from the email link and show set-password modal
    supabaseClient.auth.onAuthStateChange(async function (event, session) {
        if (event === 'PASSWORD_RECOVERY') {
            if (forgotModal) forgotModal.classList.add('hidden');
            if (setPasswordModal) setPasswordModal.classList.remove('hidden');
            if (setPasswordMessage) setPasswordMessage.classList.add('hidden');
        }
    });

    // Also check hash on load (some browsers fire before listener is attached)
    (async function checkRecoveryOnLoad() {
        try {
            const hash = window.location.hash || '';
            if (hash.includes('type=recovery') || hash.includes('type%3Drecovery')) {
                if (setPasswordModal) setPasswordModal.classList.remove('hidden');
            }
        } catch (e) {
            console.warn('recovery check failed', e);
        }
    })();

    if (setPasswordBtn) {
        setPasswordBtn.addEventListener('click', async function () {
            const pw = (newPassword?.value || '').trim();
            const pw2 = (confirmPassword?.value || '').trim();

            if (!pw || pw.length < 8) {
                showSetPasswordMessage('Password must be at least 8 characters.', true);
                return;
            }
            if (pw !== pw2) {
                showSetPasswordMessage('Passwords do not match.', true);
                return;
            }

            setPasswordBtn.disabled = true;
            setPasswordBtn.textContent = 'Updating…';

            try {
                const { error } = await supabaseClient.auth.updateUser({ password: pw });
                if (error) {
                    showSetPasswordMessage(error.message || 'Could not update password.', true);
                    return;
                }

                showSetPasswordMessage('Password updated. You can sign in with your new password.', false);

                // Clear recovery hash from URL
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }

                // Mark password as permanently changed so the force modal does not reappear
                try {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    const email = (user?.email || '').toLowerCase().trim();
                    if (email) {
                        await supabaseClient
                            .from('customers')
                            .update({ password_changed: true })
                            .ilike('email', email);
                    }
                } catch (e) {
                    console.warn('password_changed update on recovery failed:', e);
                }

                // Sign out recovery session so they log in cleanly
                await supabaseClient.auth.signOut();

                setTimeout(function () {
                    if (setPasswordModal) setPasswordModal.classList.add('hidden');
                    if (newPassword) newPassword.value = '';
                    if (confirmPassword) confirmPassword.value = '';
                }, 1500);
            } catch (err) {
                console.error(err);
                showSetPasswordMessage('Something went wrong. Please try again.', true);
            } finally {
                setPasswordBtn.disabled = false;
                setPasswordBtn.textContent = 'Update password';
            }
        });
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
}