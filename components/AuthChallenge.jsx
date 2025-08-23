(function() {
  'use strict';
  
  console.log('[AuthChallenge] Loading component...');
  
  // Check for React availability
  if (typeof window.React === 'undefined') {
    console.error('[AuthChallenge] React not available! Deferring...');
    setTimeout(function() {
      if (window.React) {
        console.log('[AuthChallenge] React now available, retrying...');
        arguments.callee();
      }
    }, 100);
    return;
  }
  
  // Extract React and hooks from global
  var React = window.React;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var h = React.createElement;
  
  function AuthChallenge(props) {
    console.log('[AuthChallenge] Component rendering with props:', props);
    
    // State management
    var challengeState = useState(null);
    var challenge = challengeState[0];
    var setChallenge = challengeState[1];
    
    var userInputState = useState('');
    var userInput = userInputState[0];
    var setUserInput = userInputState[1];
    
    var errorState = useState('');
    var error = errorState[0];
    var setError = errorState[1];
    
    var loadingState = useState(false);
    var loading = loadingState[0];
    var setLoading = loadingState[1];
    
    var attemptsState = useState(3);
    var attempts = attemptsState[0];
    var setAttempts = attemptsState[1];
    
    var loadingStatusState = useState('initial'); // 'initial', 'loading', 'retrying', 'failed', 'loaded'
    var loadingStatus = loadingStatusState[0];
    var setLoadingStatus = loadingStatusState[1];
    
    // Use ref to track retry attempts
    var retryCountRef = useRef(0);
    
    // White Rabbit theme colors
    var theme = {
      bg: '#0a0a0a',
      cardBg: '#1a1a1a',
      inputBg: '#0f0f0f',
      text: '#e0e0e0',
      dimText: '#808080',
      accent: '#00ff00',
      error: '#ff3333',
      border: '#333333'
    };
    
    // Load challenge function
    var loadChallenge = async function() {
      var currentRetry = retryCountRef.current;
      console.log('[AuthChallenge] Loading challenge from security API... (retry: ' + currentRetry + ')');
      
      try {
        // FIRST: Check localStorage for saved challenge
        const savedChallenge = localStorage.getItem('echo_challenge');
        if (savedChallenge) {
          console.log('[AuthChallenge] Found saved challenge in localStorage');
          try {
            const decoded = JSON.parse(atob(savedChallenge));
            console.log('[AuthChallenge] Decoded challenge:', decoded);
            setChallenge({
              prompt: decoded.prompt,
              expectedCompletion: decoded.expectedCompletion,
              attemptsRemaining: 3,
              type: decoded.type || 'completion'
            });
            setAttempts(3);
            setLoadingStatus('loaded');
            retryCountRef.current = 0;
            return; // Exit early - we found the challenge!
          } catch (decodeError) {
            console.error('[AuthChallenge] Failed to decode saved challenge:', decodeError);
          }
        }
        
        if (!window.myai || !window.myai.security) {
          throw new Error('Security API not available');
        }
        
        var challengeData = await window.myai.security.getChallenge();
        console.log('[AuthChallenge] Challenge loaded:', challengeData);
        
        if (challengeData) {
          setChallenge(challengeData);
          setAttempts(challengeData.attemptsRemaining || 3);
          setLoadingStatus('loaded');
          retryCountRef.current = 0; // Reset on success
        } else {
          throw new Error('No challenge data received');
        }
      } catch (error) {
        console.error('[AuthChallenge] Failed to load challenge:', error);
        
        // Check if we should retry
        if (currentRetry < 3) {
          retryCountRef.current = currentRetry + 1;
          console.log('[AuthChallenge] Will retry in 1 second... (attempt ' + (currentRetry + 1) + ' of 3)');
          setLoadingStatus('retrying');
          
          setTimeout(function() {
            loadChallenge();
          }, 1000);
        } else {
          // Max retries reached, use fallback
          console.log('[AuthChallenge] Max retries reached, using fallback challenge');
          setChallenge({
            prompt: "The quick brown fox",
            expectedCompletion: "jumps over the lazy dog",
            attemptsRemaining: 3,
            type: 'completion'
          });
          setAttempts(3);
          setLoadingStatus('loaded');
        }
      }
    };
    
    // Load challenge on mount - ONLY ONCE
    useEffect(function() {
      if (loadingStatus === 'initial') {
        console.log('[AuthChallenge] useEffect - initial load');
        setLoadingStatus('loading');
        loadChallenge();
      }
    }, []); // Empty dependency array - runs only once
    
    var handleSubmit = async function() {
      console.log('[AuthChallenge] Submit attempt with input:', userInput);
      
      if (!userInput.trim()) {
        console.log('[AuthChallenge] Empty input, ignoring');
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        // Development bypass
        if (userInput.toLowerCase() === 'bypass' || userInput.toLowerCase() === 'dev') {
          console.log('[AuthChallenge] Development bypass activated');
          if (props.onSuccess) {
            props.onSuccess();
          } else if (props.onAuthenticated) {
            props.onAuthenticated();
          }
          return;
        }
        
        // Check if security API is available
        if (!window.myai || !window.myai.security || !window.myai.security.verifyCompletion) {
          console.warn('[AuthChallenge] Security API not available, using fallback verification');
          
          // Simple fallback verification
          var isCorrect = false;
          if (challenge && challenge.expectedCompletion) {
            isCorrect = userInput.toLowerCase().trim() === challenge.expectedCompletion.toLowerCase().trim();
          }
          
          if (isCorrect) {
            console.log('[AuthChallenge] Fallback authentication successful!');
            if (props.onSuccess) {
              props.onSuccess();
            } else if (props.onAuthenticated) {
              props.onAuthenticated();
            }
          } else {
            var newAttempts = attempts - 1;
            setAttempts(newAttempts);
            setError('Incorrect. ' + newAttempts + ' attempts remaining.');
            setUserInput('');
            
            if (newAttempts === 0 && props.onFailure) {
              props.onFailure(new Error('No attempts remaining'));
            }
          }
          return;
        }
        
        // Normal verification flow
        console.log('[AuthChallenge] Verifying completion with security API...');
        var result = await window.myai.security.verifyCompletion(userInput);
        console.log('[AuthChallenge] Verification result:', result);
        
        if (result.success) {
          console.log('[AuthChallenge] Authentication successful!');
          if (props.onSuccess) {
            props.onSuccess();
          } else if (props.onAuthenticated) {
            props.onAuthenticated();
          }
        } else {
          handleFailedAttempt(result);
        }
      } catch (error) {
        console.error('[AuthChallenge] Verification error:', error);
        setError('Verification failed: ' + error.message);
        if (props.onFailure) {
          props.onFailure(error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    var handleFailedAttempt = function(result) {
      if (result.destroyed) {
        console.error('[AuthChallenge] Security breach - data destroyed');
        setError('Security breach detected. Data has been destroyed.');
        if (props.onFailure) {
          props.onFailure(new Error('Data destroyed'));
        }
      } else if (result.locked) {
        console.error('[AuthChallenge] System locked');
        setError('Too many failed attempts. System locked for 24 hours.');
        if (props.onFailure) {
          props.onFailure(new Error('System locked'));
        }
      } else {
        console.log('[AuthChallenge] Incorrect answer');
        setAttempts(result.attemptsRemaining || 0);
        var errorMsg = 'Incorrect. ' + (result.attemptsRemaining || 0) + ' attempts remaining.';
        if (result.hint) {
          errorMsg += ' ' + result.hint;
        }
        setError(errorMsg);
        setUserInput('');
        
        if (props.onFailure && result.attemptsRemaining === 0) {
          props.onFailure(new Error('No attempts remaining'));
        }
      }
    };
    
    var handleKeyPress = function(e) {
      if (e.key === 'Enter' && !loading && attempts > 0) {
        console.log('[AuthChallenge] Enter key pressed, submitting...');
        handleSubmit();
      }
    };
    
    var handleInputChange = function(e) {
      setUserInput(e.target.value);
      if (props.onDebug) {
        props.onDebug('Input changed: ' + e.target.value.length + ' chars');
      }
    };
    
    // Loading state
    if (loadingStatus !== 'loaded') {
      console.log('[AuthChallenge] Still loading, status:', loadingStatus);
      return h('div', { 
        className: 'auth-challenge-wrapper white-rabbit',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: theme.bg,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      }, 
        h('div', { style: { color: theme.text, textAlign: 'center' } }, [
          h('div', { 
            key: 'loading-text',
            style: { fontSize: '1.125rem' }
          }, 'Loading security module...'),
          loadingStatus === 'retrying' && h('div', { 
            key: 'retry-text',
            style: { 
              fontSize: '0.875rem', 
              marginTop: '0.5rem', 
              color: theme.dimText 
            } 
          }, 'Retry attempt ' + retryCountRef.current + ' of 3'),
          h('div', {
            key: 'spinner',
            style: {
              marginTop: '1rem',
              width: '2rem',
              height: '2rem',
              border: '2px solid ' + theme.border,
              borderTopColor: theme.accent,
              borderRadius: '50%',
              margin: '1rem auto',
              animation: 'spin 1s linear infinite'
            }
          })
        ])
      );
    }
    
    // Main render
    console.log('[AuthChallenge] Rendering main UI, attempts:', attempts);
    
    return h('div', {
      className: 'auth-challenge-wrapper white-rabbit',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: theme.bg,
        fontFamily: 'monospace'
      }
    },
      h('div', {
        className: 'auth-challenge-container',
        style: {
          maxWidth: '600px',
          width: '100%',
          padding: '2rem',
          backgroundColor: theme.cardBg,
          borderRadius: '8px',
          border: '1px solid ' + theme.border,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }
      }, [
        // Header with Echo icon
        h('div', { key: 'header', style: { textAlign: 'center', marginBottom: '2rem' } }, [
          h('div', {
            key: 'icon',
            style: {
              width: '60px',
              height: '60px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              border: '2px solid ' + theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: theme.accent
            }
          }, '🔒'),
          h('h2', {
            key: 'title',
            style: {
              fontSize: '1.875rem',
              fontWeight: '300',
              letterSpacing: '0.05em',
              color: theme.text,
              marginBottom: '0.5rem'
            }
          }, 'ECHO RUBICON'),
          h('p', {
            key: 'subtitle',
            style: {
              fontSize: '0.875rem',
              color: theme.dimText,
              fontWeight: '300'
            }
          }, 'Complete the thought to continue')
        ]),
        // Challenge prompt (conditionally rendered)
        challenge ? h('div', {
          key: 'prompt',
          style: {
            backgroundColor: theme.inputBg,
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: '1px solid ' + theme.border,
            width: '100%'
          }
        },
          h('p', {
            style: {
              fontSize: '1.125rem',
              color: theme.accent,
              fontStyle: 'italic',
              fontWeight: '300'
            }
          }, '"' + challenge.prompt + '..."')
        ) : null,
        // Input field
        h('input', {
          key: 'input',
          type: 'text',
          autoComplete: 'off',
          value: userInput,
          onChange: handleInputChange,
          onKeyPress: handleKeyPress,
          className: 'auth-input',
          style: {
            width: '100%',
            maxWidth: '100%',
            padding: '0.75rem',
            border: '1px solid ' + theme.border,
            backgroundColor: theme.inputBg,
            color: theme.text,
            borderRadius: '4px',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            fontFamily: 'inherit'
          },
          onFocus: function (e) {
            e.target.style.borderColor = theme.accent;
          },
          onBlur: function (e) {
            e.target.style.borderColor = theme.border;
          },
          placeholder: '...complete the thought',
          disabled: loading || attempts === 0,
          autoFocus: true
        }),
        // Error message (conditionally rendered)
        error ? h('div', {
          key: 'error',
          style: {
            color: theme.error,
            fontSize: '0.875rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }
        }, [
          h('span', { key: 'icon' }, '⚠'),
          h('span', { key: 'text' }, error)
        ]) : null,
        // Attempts remaining
        h('div', {
          key: 'attempts',
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: theme.dimText,
            marginBottom: '1.5rem',
            width: '100%'
          }
        }, [
          h('span', { key: 'remaining' }, 'Attempts remaining: ' + attempts),
          (attempts <= 1) ? h('span', {
            key: 'warning',
            style: { color: theme.error }
          }, '⚠ Final attempt') : null
        ]),
        // Submit button
        h('button', {
          key: 'submit',
          onClick: handleSubmit,
          disabled: loading || attempts === 0,
          style: {
            width: '100%',
            padding: '0.75rem',
            backgroundColor: loading || attempts === 0 ? theme.border : theme.accent,
            color: loading || attempts === 0 ? theme.dimText : theme.bg,
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: loading || attempts === 0 ? 'not-allowed' : 'pointer',
            border: 'none',
            marginBottom: '1rem',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          },
          onMouseEnter: function (e) {
            if (!loading && attempts > 0) {
              e.target.style.opacity = '0.9';
            }
          },
          onMouseLeave: function (e) {
            e.target.style.opacity = '1';
          }
        }, loading ? 'Verifying...' : 'Authenticate'),
        // Footer
        h('div', { key: 'footer', style: { textAlign: 'center', marginTop: '2rem' } }, [
          h('p', {
            key: 'footer-text',
            style: {
              fontSize: '0.75rem',
              color: theme.dimText,
              fontWeight: '300',
              lineHeight: '1.4'
            }
          }, 'Echo recognizes you by how you complete thoughts'),
          h('p', {
            key: 'dev-hint',
            style: {
              marginTop: '0.5rem',
              fontSize: '0.625rem',
              color: theme.border,
              fontFamily: 'monospace'
            }
          }, '// dev: type "bypass" to skip')
        ])
      ])
    );
  }
  
  // Add spinning animation
  var style = document.createElement('style');
  style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
  
  // Export to window
  window.AuthChallenge = AuthChallenge;
  console.log('[AuthChallenge] Component loaded and exposed to window');
  
  // Notify MyAI if it's waiting
  if (window.dispatchEvent) {
    console.log('[AuthChallenge] Dispatching authchallenge-loaded event');
    window.dispatchEvent(new Event('authchallenge-loaded'));
  }
})();