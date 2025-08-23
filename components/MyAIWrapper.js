(function () {
  'use strict';

  const React = window.React;
  const h = React.createElement;

  function Gatekeeper() {
    const auth = window.useAuth ? window.useAuth() : { isAuthenticated: false };
    const setIsAuthenticated = auth.setIsAuthenticated;

    console.log('[Gatekeeper] Auth state:', auth);

    if (!auth.isAuthenticated) {
      return h(window.AuthChallenge || 'div', {
        onSuccess: () => {
          console.log('[Gatekeeper] Auth succeeded. Setting flag.');
          if (typeof setIsAuthenticated === 'function') {
            setIsAuthenticated(true);
          }
        },
        onFailure: (err) => {
          console.error('[Gatekeeper] Auth failed:', err);
        }
      });
    }

    return h(window.MyAICore || 'div', null, '⚠️ MyAICore not found');
  }

  if (typeof window !== 'undefined') {
    window.MyAI = Gatekeeper;
    console.log('[Gatekeeper] Bound as window.MyAI');
  }
})();
