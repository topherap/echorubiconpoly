// auth-context.js - Complete authentication context for Echo Rubicon
(function(window) {
  const { createContext, useContext, useState, useEffect } = window.React;
  const h = window.React.createElement;

  // Create the auth context
  const AuthContext = createContext(null);

  // Auth Provider Component
  window.AuthProvider = function({ children }) {
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Check for existing token on mount
    useEffect(() => {
      const storedToken = sessionStorage.getItem('echo_rubicon_token');
      if (storedToken) {
        // Verify token is still valid
        verifyToken(storedToken);
      } else {
        setIsLoading(false);
      }
    }, []);

    const verifyToken = async (token) => {
      try {
        const response = await fetch('http://localhost:49200/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setToken(token);
          setUser(data.user);
        } else {
          // Token is invalid, clear it
          sessionStorage.removeItem('echo_rubicon_token');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        sessionStorage.removeItem('echo_rubicon_token');
      } finally {
        setIsLoading(false);
      }
    };

    const login = async (username, password) => {
      const response = await fetch('http://localhost:49200/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and update state
      const token = data.token;
      sessionStorage.setItem('echo_rubicon_token', token);
      setToken(token);
      setUser({ username });

      return data;
    };

    const logout = () => {
      sessionStorage.removeItem('echo_rubicon_token');
      setToken(null);
      setUser(null);
    };

    const value = {
      token,
      user,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout
    };

    return h(AuthContext.Provider, { value }, children);
  };

  // Custom hook to use auth context
  window.useAuth = function() {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };
})(window);