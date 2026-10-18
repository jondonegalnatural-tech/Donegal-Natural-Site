// Shared portal auth guard. allowedRoles is the list of profiles.role values that may see the page.
async function runAuthGuard(allowedRoles) {
  document.documentElement.style.visibility = 'hidden';
  try {
    const supabase = window.supabaseClient;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      localStorage.removeItem('currentUser');
      window.location.replace('login-portal.html');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (!profile || !allowedRoles.includes(profile.role)) {
      localStorage.removeItem('currentUser');
      window.location.replace('login-portal.html');
      return;
    }
    document.documentElement.style.visibility = 'visible';
  } catch (e) {
    localStorage.removeItem('currentUser');
    window.location.replace('login-portal.html');
  }
}
