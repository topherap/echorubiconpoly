(function() {
  'use strict';
  
  // Wait for React
  if (typeof window.React === 'undefined') {
    console.warn('[Login] React not ready, deferring...');
    setTimeout(arguments.callee, 50);
    return;
  }
  
  const React = window.React;
  const { useState } = React;
  const h = React.createElement;

  const Login = ({ onAuthSuccess }) => {
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');

      if (!username || !password) {
        setError('Please enter username and password');
        return;
      }

      if (isSignupMode && password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setLoading(true);

      try {
        const endpoint = isSignupMode ? '/signup' : '/login';
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `${isSignupMode ? 'Signup' : 'Login'} failed`);
        }

        // Store token and notify parent
        localStorage.setItem('echo_rubicon_token', data.token);
        onAuthSuccess({ username, token: data.token });
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const toggleMode = () => {
      setIsSignupMode(!isSignupMode);
      setError('');
      setPassword('');
      setConfirmPassword('');
    };

    return h('div', { className: 'auth-container' },
      h('div', { className: 'auth-card' },
        h('h2', { className: 'auth-title' }, 
          isSignupMode ? 'Create Account' : 'Welcome Back'
        ),
        
        error && h('div', { className: 'auth-error' }, error),
        
        h('form', { onSubmit: handleSubmit, className: 'auth-form' },
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'username' }, 'Username'),
            h('input', {
              type: 'text',
              id: 'username',
              value: username,
              onChange: (e) => setUsername(e.target.value),
              placeholder: 'Enter your username',
              disabled: loading,
              autoComplete: 'username'
            })
          ),
          
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'password' }, 'Password'),
            h('input', {
              type: 'password',
              id: 'password',
              value: password,
              onChange: (e) => setPassword(e.target.value),
              placeholder: 'Enter your password',
              disabled: loading,
              autoComplete: isSignupMode ? 'new-password' : 'current-password'
            })
          ),
          
          isSignupMode && h('div', { className: 'form-group' },
            h('label', { htmlFor: 'confirmPassword' }, 'Confirm Password'),
            h('input', {
              type: 'password',
              id: 'confirmPassword',
              value: confirmPassword,
              onChange: (e) => setConfirmPassword(e.target.value),
              placeholder: 'Confirm your password',
              disabled: loading,
              autoComplete: 'new-password'
            })
          ),
          
          h('button', {
            type: 'submit',
            className: 'auth-submit-btn',
            disabled: loading
          }, loading ? 'Please wait...' : (isSignupMode ? 'Sign Up' : 'Log In'))
        ),
        
        h('div', { className: 'auth-toggle' },
          h('span', null, 
            isSignupMode ? 'Already have an account? ' : "Don't have an account? "
          ),
          h('button', {
            type: 'button',
            onClick: toggleMode,
            className: 'auth-toggle-btn',
            disabled: loading
          }, isSignupMode ? 'Log In' : 'Sign Up')
        )
      )
    );
  };

  window.Login = Login;
  console.log('[Login] Component loaded and exposed to window');
})();