(function() {
  'use strict';
  
  if (typeof window.React === 'undefined') {
    console.warn('[PassphraseModal] React not ready, deferring...');
    setTimeout(arguments.callee, 50);
    return;
  }

  const React = window.React;
  const h = React.createElement;

  // Stub for now - implement full security later
  const PassphraseModal = ({ onSuccess, onCancel }) => {
    return h('div', { className: 'passphrase-modal' },
      h('button', { onClick: onCancel }, 'Cancel')
    );
  };

  window.PassphraseModal = PassphraseModal;
  console.log('[PassphraseModal] Component loaded (stub)');
})();