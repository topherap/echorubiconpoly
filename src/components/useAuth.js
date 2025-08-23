(function () {
  'use strict';

  // Wait for React
  if (typeof window.React === 'undefined') {
    console.warn('[useAuth] React not ready, deferring...');
    setTimeout(arguments.callee, 50);
    return;
  }

  const React = window.React;
  const h = React.createElement;
  const useState = React.useState;
  const useContext = React.useContext;

  // 🔧 FIX: Define context FIRST
  const AuthContext = React.createContext(null);
  window.AuthContext = AuthContext;

  window.useAuth = function () {
    return useContext(AuthContext);
  };

  window.AuthProvider = function ({ children }) {
    const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
  // Check localStorage on initialization
  const saved = localStorage.getItem('echoAuthenticated');
  console.log('[AuthProvider] Initializing auth state, saved value:', saved);
  return saved === 'true';
});

const value = {
  isAuthenticated,
  setIsAuthenticated
};

    return h(AuthContext.Provider, { value }, children);
  };

  console.log('[useAuth] Auth hook and provider registered');
})();
