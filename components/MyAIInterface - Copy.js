// ==========================
// MyAIInterface.js
// ==========================

const h = React.createElement;

function MyAIInterface(props) {
  const {
    theme,
    showDevPanel,
    DevPanel,
    status,
    chatContainerRef,
    aiResponses,
    voicePrompt,
    setVoicePrompt,
    sendVoiceCommand,
    isVoiceLoading,
    isListening,
    MicIcon,
    SendIcon,
    voiceEnabled,
    handlePushToTalk,
    useAPI,
    selectedAPIModel,
    selectedLocalModel,
    apiModelOptions,
    localModelOptions,
    toggleUseAPI,
    handleAPIModelChange,
    handleLocalModelChange,
    controlButtonStyle,
    toggleVoice,
    UploadIcon,
    HotwordIcon,
    hotwordIconStyle,
    toggleHotword,
    isHotwordLoading,
    hotwordActive,
    SettingsIcon,
    isSettingsOpen,
    setIsSettingsOpen
  } = props;

  const responses = aiResponses || [];

  return h('div', { className: 'login-overlay-wrapper ' + theme }, [
    h('div', { className: 'myai-container ' + theme }, [
      showDevPanel && h(DevPanel),

      h('div', { key: 'main', className: 'main-content' }, [
        h('div', { className: 'status-bar' }, [
          h('span', { className: 'status-text' }, status)
        ]),

        h('div', {
          className: 'chat-container',
          ref: chatContainerRef,
          onScroll: function () {}
        },
          responses.map(function (item, index) {
            return h('div', {
              key: `${index}-${item.prompt?.substring(0, 10) || 'blank'}`,
              className: 'chat-message'
            }, [
              h('div', { className: 'user-message' }, item.prompt),
              h('div', { className: 'ai-response' }, item.response)
            ]);
          })
        ),

        h('div', { className: 'voice-section' }, [
          h('div', { className: 'voice-input-container' }, [
            h('button', {
              className: 'mic-button',
              onClick: function () {},
              disabled: isVoiceLoading,
              style: { marginRight: 8 }
            }, h('img', { src: MicIcon, alt: 'Mic', style: { width: '24px', height: '24px' } })),

            isListening && h('div', {
              style: {
                position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(255, 0, 0, 0.8)', color: 'white', padding: '4px 12px',
                borderRadius: '12px', fontSize: '12px', zIndex: 10
              }
            }, '🎤 Listening...'),

            h('textarea', {
              value: voicePrompt,
              onChange: function (e) {
                setVoicePrompt(e.target.value);
              },
              placeholder: 'Ask me anything...',
              rows: 1,
              style: {
                flexGrow: 1,
                width: '100%',
                minHeight: '40px',
                maxHeight: '120px',
                resize: 'none',
                overflow: 'auto'
              }
            }),

            h('button', {
              onClick: sendVoiceCommand,
              disabled: !voicePrompt?.trim(),
              style: { marginLeft: '8px' }
            }, h('img', { src: SendIcon, alt: 'Send', style: { width: '24px', height: '24px' } }))
          ])
        ])
      ])
    ])
  ]);
}

if (typeof window !== 'undefined') {
  window.MyAIInterface = MyAIInterface;
}
