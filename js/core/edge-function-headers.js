// Edge Function auth — use the logged-in user's JWT (not the public anon key).
// Reads the portal's supabase client at call time (window.supabaseClient).
async function getEdgeFunctionHeaders() {
    const supabaseClient = window.supabaseClient;
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.access_token) {
        throw new Error('Not signed in — cannot call Edge Function');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON_KEY
    };
}

window.getEdgeFunctionHeaders = getEdgeFunctionHeaders;
