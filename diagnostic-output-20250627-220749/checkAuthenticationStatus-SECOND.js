const checkAuthenticationStatus = async () => {
  console.log('[DEBUG-AUTH] checkAuthenticationStatus called');
  console.log('[DEBUG-AUTH] Starting auth check...');
  console.log('[DEBUG-AUTH] localStorage echo_onboarding_complete:', localStorage.getItem('echo_onboarding_complete'));
  console.log('[DEBUG-AUTH] All localStorage keys:', Object.keys(localStorage));
  
  // Check if onboarding is complete
  const isOnboardingComplete = localStorage.getItem('echo_onboarding_complete') === 'true';
  
  console.log('[DEBUG-AUTH] Onboarding check:', {
    stored: localStorage.getItem('echo_onboarding_complete'),
    isComplete: isOnboardingComplete
  });
  
  // If onboarding NOT complete, redirect to onboarding
  if (!isOnboardingComplete) {
    console.log('[DEBUG-AUTH] Onboarding not complete, redirecting...');
    window.location.href = 'onboarding.html';
    return;
  }
  
  // CHECK FOR SAVED SESSION IMMEDIATELY AFTER ONBOARDING CHECK
  const savedAuthSession = localStorage.getItem('echo_auth_session');
  const savedAuthTimestamp = localStorage.getItem('echo_auth_timestamp');
  
  console.log('[DEBUG-AUTH] Saved auth session:', savedAuthSession);
  console.log('[DEBUG-AUTH] Saved auth timestamp:', savedAuthTimestamp);
  
  if (savedAuthSession === 'true') {
    console.log('[DEBUG-AUTH] Found valid saved session, skipping security check entirely');
    setAuthState({
      isChecking: false,
      isAuthenticated: true,
      showAuthChallenge: false,
      authError: null,
      attemptCount: 0,
      sessionValid: true
    });
    setStatus('Authenticated via saved session');
    // Call initializeApp here since we're authenticated
    await initializeApp();
    return;  // EXIT HERE - don't check security API
  }
  
  // Only proceed with security checks if no saved session exists
  console.log('[DEBUG-AUTH] No saved session found, proceeding with security check...');
  
  try {
    // Check if security API is available
    if (!window.myai || !window.myai.security) {
      console.error('[DEBUG-AUTH] Security API not available');
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        showAuthChallenge: true,
        authError: 'Security API not available',
        attemptCount: 0,
        sessionValid: false
      });
      return;
    }
    
    // Check if authenticated
    console.log('[DEBUG-AUTH] Checking authentication status...');
    const isAuth = await window.myai.security.isAuthenticated();
    console.log('[DEBUG-AUTH] Is authenticated:', isAuth);
    
    // Check for existing session
    console.log('[DEBUG-AUTH] Checking for existing session...');
    let sessionValid = false;
    if (window.myai.security.checkSession) {
      sessionValid = await window.myai.security.checkSession();
      console.log('[DEBUG-AUTH] Session valid:', sessionValid);
    }
    
    if (isAuth && sessionValid) {
      console.log('[DEBUG-AUTH] User authenticated with valid session, showing main interface');
      setAuthState({
        isChecking: false,
        isAuthenticated: true,
        showAuthChallenge: false,
        authError: null,
        attemptCount: 0,
        sessionValid: true
      });
      setStatus('Authenticated');
    } else {
      console.log('[DEBUG-AUTH] User NOT authenticated or session invalid, showing auth challenge');
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        showAuthChallenge: true,
        authError: null,
        attemptCount: 0,
        sessionValid: false
      });
      setStatus('Authentication required');
    }
  } catch (error) {
    console.error('[DEBUG-AUTH] Error checking auth status:', error);
    setAuthState({
      isChecking: false,
      isAuthenticated: false,
      showAuthChallenge: true,
      authError: error.message,
      attemptCount: 0,
      sessionValid: false
    });
    setStatus('Authentication check failed');
  }
};
