(function() {
  'use strict';
  
  // Wait for React
  if (typeof window.React === 'undefined') {
    console.warn('[AuthPanel] React not ready, deferring...');
    setTimeout(arguments.callee, 50);
    return;
  }
  
  const React = window.React;
  const { useState, useEffect } = React;
  const h = React.createElement;

  const AuthPanel = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
      checkAuth();
    }, []);

    const checkAuth = async () => {
      const token = localStorage.getItem('echo_rubicon_token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/auth/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser({ username: data.user.username });
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('echo_rubicon_token');
          }
        } else {
          localStorage.removeItem('echo_rubicon_token');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('echo_rubicon_token');
      } finally {
        setLoading(false);
      }
    };

    const handleAuthSuccess = (authData) => {
      setUser({ username: authData.username });
      setIsAuthenticated(true);
    };

    const handleLogout = () => {
      localStorage.removeItem('echo_rubicon_token');
      setIsAuthenticated(false);
      setUser(null);
    };

    if (loading) {
      return h('div', { className: 'auth-loading' }, 
        h('div', { className: 'loading-spinner' }, 'Loading...')
      );
    }

    if (!isAuthenticated) {
      return h(window.Login, { onAuthSuccess: handleAuthSuccess });
    }

    // Pass auth props to children
    const childrenWithProps = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { user, onLogout: handleLogout });
      }
      return child;
    });

    return h(React.Fragment, null, childrenWithProps);
  };

  window.AuthPanel = AuthPanel;
  console.log('[AuthPanel] Component loaded and exposed to window');
})();