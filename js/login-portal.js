// =============================================
// Donegal Natural - Login Portal JavaScript
// Supabase Auth only
// =============================================

// ================== SUPABASE CLIENT ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =====================================================

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
            showError("Please enter both email and password.");
            return;
        }

        // Require an email address
        if (!username.includes('@')) {
            showError("Please enter your email address (not a username).");
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: username,
                password: password
            });

            if (error) {
                showError(error.message || "Invalid email or password.");
                return;
            }

            // Fetch the profile to get the role
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile) {
                showError("Login succeeded but profile not found. Contact an administrator.");
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

            // Redirect based on role
            if (profile.role === "customer") {
                window.location.href = "wholesale-portal.html";
            } else if (profile.role === "salesman") {
                window.location.href = "salesman-portal.html";
            } else if (profile.role === "admin") {
                window.location.href = "internal-portal.html";
            } else {
                showError("Unknown role. Contact an administrator.");
            }

        } catch (err) {
            console.error(err);
            showError("Login failed. Please try again.");
        }
    });

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }

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
                    showForgotMessage(error.message || 'Could not send reset email.', true);
                } else {
                    showForgotMessage('If an account exists for that email, a reset link has been sent. Check your inbox (and spam).', false);
                }
            } catch (err) {
                console.error(err);
                showForgotMessage('Something went wrong. Please try again.', true);
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

            if (!pw || pw.length < 6) {
                showSetPasswordMessage('Password must be at least 6 characters.', true);
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