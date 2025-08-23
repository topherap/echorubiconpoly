// =====================
// test-core-hook.js
// =====================

global.window = {}; // simulate browser

window.React = require('react');
require('./MyAICore.js'); // this registers to window + global

if (typeof window.MyAICore?.getProps === 'function') {
  const props = window.MyAICore.getProps();
  console.log('✅ test props:', Object.keys(props));
  console.log('✅ typeof setVoicePrompt:', typeof props.setVoicePrompt);
} else {
  console.error('❌ MyAICore.getProps not available');
}


