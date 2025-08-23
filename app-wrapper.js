// app-wrapper.js - Main app wrapper that handles authentication state
(function(window) {
  const { useState, useEffect } = window.React;
  const { useAuth } = window;
  const h = window.React.createElement;

  window.AppWrapper = function() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    // Show login panel when not authenticated
    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        setShowLogin(true);
      }
    }, [isAuthenticated, isLoading]);

    // Show loading screen while checking auth
    if (isLoading) {
      return h('div', { className: 'loading-screen' }, [
        h('div', { className: 'loading-content' }, [
          h('h1', null, 'Echo Rubicon'),
          h('p', null, 'Initializing...')
        ])
      ]);
    }

    // Main app content when authenticated
    if (isAuthenticated) {
      return h('div', { className: 'app-authenticated' }, [
        h('div', { className: 'app-header' }, [
          h('h1', null, 'Echo Rubicon'),
          h('div', { className: 'user-info' }, [
            h('span', null, `Welcome, ${user?.username || 'User'}`),
            h('button', {
              onClick: () => {
                const { logout } = window.useAuth();
                logout();
              },
              className: 'logout-button'
            }, 'Logout')
          ])
        ]),
        // Your main app component goes here
        // h(window.YourMainAppComponent)
        h('div', { className: 'main-content' }, [
          h('p', null, 'Main app content will be loaded here'),
          h('p', null, 'Replace this with your actual app component')
        ])
      ]);
    }

    // Show login panel when not authenticated
    return h('div', { className: 'app-unauthenticated' }, [
      showLogin && h(window.LoginPanel, {
        onClose: () => {
          // Don't allow closing without authentication
          if (!isAuthenticated) {
            setShowLogin(true);
          }
        }
      })
    ]);
  };

  // Root App Component with Auth Provider
  window.EchoRubiconApp = function() {
    return h(window.AuthProvider, null, [
      h(window.AppWrapper)
    ]);
  };
})(window);