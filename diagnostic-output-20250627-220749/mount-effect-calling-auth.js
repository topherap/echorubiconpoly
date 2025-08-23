useEffect(function() {
  console.log('[DEBUG-AUTH-EFFECT] Component mounted, checking authentication...');
  checkAuthenticationStatus();
}, [])
