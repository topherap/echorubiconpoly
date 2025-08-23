const React = require('react');
const h = React.createElement;
const { useRef, useEffect, useState } = React;

function ChatPanel({ messages, setMessages, sendVoiceCommand }) {
  const [input, setInput] = useState('');
  const chatRef = useRef(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const prompt = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setInput('');

    // Build minimal config to pass through
    // Get the selected model from the dropdown
const selectedModel = document.querySelector('.model-selector select')?.value || 'openchat';
console.log('[ChatPanel] Sending with model:', selectedModel);

// Pass the model in the config
sendVoiceCommand({ 
  voicePrompt: prompt,
  selectedLocalModel: selectedModel 
});
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return h('div', { className: 'chat-panel' }, [
    h('div', { className: 'chat-history', ref: chatRef }, 
      messages.map((m, i) => h('div', {
        key: i,
        className: m.role === 'user' ? 'message user-message' : 'message ai-message'
      }, m.content))
    ),
    h('div', { className: 'chat-input-bar' }, [
      h('textarea', {
        className: 'chat-input',
        value: input,
        onChange: e => setInput(e.target.value),
        onKeyDown: handleKeyPress,
        placeholder: 'Type your message...'
      }),
      h('button', { onClick: handleSend, className: 'send-button' }, 'Send')
    ])
  ]);
}

module.exports = ChatPanel;
