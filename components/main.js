// components/main.js — Mount MyAI in Electron
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('myai-root');

  if (!container) {
    console.error('[main.js] ❌ Cannot find #myai-root to mount');
    return;
  }

  if (!window.MyAI || typeof ReactDOM === 'undefined') {
    console.error('[main.js] ❌ MyAI or ReactDOM not available. Mount aborted.');
    return;
  }

  try {
    const el = React.createElement(window.MyAI);
    ReactDOM.render(el, container);
    console.log('[main.js] ✅ MyAI mounted successfully');
  } catch (err) {
    console.error('[main.js] ❌ Render failed:', err);
  }
});

