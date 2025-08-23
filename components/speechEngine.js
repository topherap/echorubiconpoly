// speechEngine.js

const { logToObsidianMaster } = require('./utils/logToObsidianMaster');

function speakOutLoud(text, {
  voiceEnabled,
  voicePrompt,
  selectedAPIModel,
  setStatus,
  setAiResponses
}) {
  console.log('[DEBUG-SPEAK] Speaking text, length:', text.length);

  if (!voiceEnabled) {
    console.warn('[DEBUG-SPEAK] Voice output disabled.');
    return;
  }

  if (!window.speechSynthesis) {
    console.warn('[DEBUG-SPEAK] Speech synthesis not supported.');
    if (setStatus) setStatus('Speech synthesis unavailable in this browser.');
    if (setAiResponses) {
      setAiResponses(prev =>
        prev.concat([{ prompt: voicePrompt, response: 'Speech unavailable' }])
      );
    }
    logToObsidianMaster({
      model: selectedAPIModel || 'unknown',
      prompt: voicePrompt,
      response: 'Speech unavailable'
    });
    return;
  }

  if (window.speechSynthesis.speaking) {
    console.log('[DEBUG-SPEAK] Cancelling previous speech');
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.volume = 0.8;
  utterance.pitch = 1.0;

  window.currentUtterance = utterance;

  utterance.onstart = () => console.log('[DEBUG-SPEAK] Speech started');
  utterance.onend = () => {
    console.log('[DEBUG-SPEAK] Speech completed.');
    window.currentUtterance = null;
  };
  utterance.onerror = (event) => {
    console.error('[DEBUG-SPEAK] Speech error:', event);
    window.currentUtterance = null;
  };

  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 50);
}

module.exports = {
  speakOutLoud
};
