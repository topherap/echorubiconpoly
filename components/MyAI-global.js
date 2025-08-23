(function () {
  const React = window.React;
  const h = React.createElement;
  const useState = React.useState;

  const MyAIInterface = window.MyAIInterface || function () {
    return h('div', null, 'MyAIInterface not available');
  };

  const DevPanel = window.DevPanel || (() => null);
  const SettingsPanel = window.SettingsPanel || (() => null);
  const NotesPanel = window.NotesPanel || (() => null);
  const ChatPanel = window.ChatPanel || (() => null);
  const sendVoiceCommand = window.sendVoiceCommand || (() => {});

  function MyAI() {
    console.log('[DEBUG-MYAI] Component initialized');
    const [messages, setMessages] = useState([]);

    return h(MyAIInterface, {
      DevPanel,
      SettingsPanel,
      NotesPanel,
      ChatPanel,
      messages,
      setMessages,
      sendVoiceCommand
    });
  }

   window.MyAIInterface = MyAIInterface;

  // Set final render target to auth-aware wrapper
  window.MyAI = window.MyAIWrapper || function () {
    return React.createElement('div', null, '⚠️ MyAIWrapper not loaded');
  };

  console.log('[MyAI] window.MyAIWrapper registered as entry point');
})();
