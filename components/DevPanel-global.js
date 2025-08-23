(function () {
  'use strict';

  // ==========================
  // GLOBAL DEV PANEL CHECK
  // ==========================
  if (typeof window.React === 'undefined' || typeof window.ReactDOM === 'undefined') {
    console.error('[DevPanel] React not available, deferring...');
    setTimeout(() => window.init?.(), 100);
    return;
  }

  // ==========================
  // DEV PANEL IMPLEMENTATION
  // ==========================
  const { useState, useEffect } = React;

  function DevPanel(props) {
    const { onClose, currentTheme, apiKey } = props;
    const [debugInfo, setDebugInfo] = useState({});

    useEffect(() => {
      // Collect debug information
      const info = {
        theme: currentTheme,
        hasApiKey: !!apiKey,
        electronAPI: typeof window.electronAPI,
        ipcRenderer: typeof window.ipcRenderer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        windowKeys: Object.keys(window).length,
        reactVersion: React.version || 'Unknown'
      };
      setDebugInfo(info);
    }, [currentTheme, apiKey]);

    return React.createElement('div', {
      className: 'dev-panel-overlay'
    },
      React.createElement('div', { className: 'dev-panel' }, [
        React.createElement('div', {
          key: 'header',
          className: 'dev-panel-header'
        }, [
          React.createElement('h2', { key: 'title' }, '🔧 Dev Panel'),
          React.createElement('button', {
            key: 'close',
            onClick: onClose,
            className: 'dev-panel-close'
          }, '×')
        ]),

        React.createElement('div', {
          key: 'content',
          className: 'dev-panel-content'
        }, [
          React.createElement('h3', { key: 'debug-title' }, 'Debug Information'),
          React.createElement('pre', {
            key: 'debug-info',
            className: 'debug-info'
          }, JSON.stringify(debugInfo, null, 2)),

          React.createElement('div', { key: 'actions' }, [
            React.createElement('button', {
              key: 'test-ipc',
              onClick: () => {
                if (window.electronAPI?.ping) {
                  window.electronAPI.ping('dev-panel-test');
                  console.log('🧪 Dev panel IPC test sent');
                }
              },
              className: 'dev-button'
            }, 'Test IPC'),

            React.createElement('button', {
              key: 'clear-storage',
              onClick: () => {
                localStorage.clear();
                console.log('🧹 Local storage cleared');
              },
              className: 'dev-button'
            }, 'Clear Storage'),

            React.createElement('button', {
              key: 'reload-page',
              onClick: () => window.location.reload(),
              className: 'dev-button'
            }, 'Reload Page')
          ])
        ])
      ])
    );
  }

  // ==========================
  // EXPOSE GLOBALLY
  // ==========================
  window.DevPanel = DevPanel;
  console.log('✅ DevPanel component exposed globally');

})();
