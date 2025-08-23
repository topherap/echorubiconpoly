(function () {
  'use strict';

  (function () {
    const React = window.React;
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;

    const DevPanel = window.DevPanel || (() => null);
    const SettingsPanel = window.SettingsPanel || (() => null);
    const NotesPanel = window.NotesPanel || (() => null);
    const ChatPanel = window.ChatPanel || (() => null);
    const sendVoiceCommand = window.sendVoiceCommand || (() => {});

    function MyAI() {
      const auth = window.useAuth ? window.useAuth() : { isAuthenticated: false };
      const [messages, setMessages] = useState([]);
      const [interfaceReady, setInterfaceReady] = useState(
        !!window.MyAIRegistry?.components?.MyAIInterface
      );

      useEffect(() => {
        if (interfaceReady) return;

        const handler = (e) => {
          if (e.detail?.name === 'MyAIInterface') {
            console.log('[MyAI] MyAIInterface registered via event');
            setInterfaceReady(true);
          }
        };

        window.addEventListener('MyAI-ready', handler);
        return () => window.removeEventListener('MyAI-ready', handler);
      }, [interfaceReady]);

      // ✅ Gate 1: Still waiting for registry signal
      if (!interfaceReady) {
        return h('div', null, '⏳ Loading interface...');
      }

      // ✅ Gate 2: Not authenticated yet
      if (!auth?.isAuthenticated) {
        return h(window.AuthChallenge || 'div', {
          onSuccess: () => {
            console.log('[MyAI] Auth success, setting isAuthenticated');
            if (auth.setIsAuthenticated) auth.setIsAuthenticated(true);
          }
        }, '🔐 Loading auth...');
      }

      const MyAIInterface = window.MyAIRegistry.components.MyAIInterface;

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

    // ✅ Final export with Provider wrapper
    window.MyAI = function WrappedMyAI() {
      return h(window.AuthProvider || 'div', null, h(MyAI));
    };

    console.log('[MyAI] window.MyAI registered (auth + registry aware)');
  })();
})();
