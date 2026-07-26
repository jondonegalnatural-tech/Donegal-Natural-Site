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

            // Save session in the shape the rest of the app expects
                        localStorage.setItem('currentUser', JSON.stringify({
                id: profile.id,
                username: profile.email,
                fullName: profile.full_name || profile.email,
                role: profile.role,
                company: profile.company || '',
                email: profile.email,
                mustChangePassword: !!profile.must_change_password,
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
});