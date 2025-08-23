// MyAICore.js - Core component with error boundaries

(function() {
  const React = window.React;
  const createElement = React.createElement;
  const { useState, useEffect, useRef } = React;
  
  console.log('[MyAICore] Loading component...');
  
  function MyAICore() {
    try {
      // State initialization
      const [voicePrompt, setVoicePrompt] = useState('');
      const [messages, setMessages] = useState([]);
      const [isListening, setIsListening] = useState(false);
      const [isProcessing, setIsProcessing] = useState(false);
      const [notes, setNotes] = useState([]);
      const [selectedNote, setSelectedNote] = useState(null);
      const [currentProject, setCurrentProject] = useState(null);
      
      // === STATE BRIDGE - Expose message control globally ===
      useEffect(() => {
        // Create a global bridge for external components to update messages
        window.MyAICore = window.MyAICore || {};
        window.MyAICore.setMessages = (newMessages) => {
          console.log('[MyAICore] Setting messages from external source:', newMessages.length);
          setMessages(newMessages);
        };
        
        window.MyAICore.addMessage = (message) => {
          console.log('[MyAICore] Adding message:', message);
          setMessages(prev => [...prev, message]);
        };
        
        window.MyAICore.clearMessages = () => {
          console.log('[MyAICore] Clearing messages');
          setMessages([]);
        };
        
        window.MyAICore.getCurrentMessages = () => messages;
        
        // Also expose current project setter
        window.MyAICore.setCurrentProject = setCurrentProject;
        
        console.log('[MyAICore] State bridge initialized');
        
        // Cleanup on unmount
        return () => {
          delete window.MyAICore.setMessages;
          delete window.MyAICore.addMessage;
          delete window.MyAICore.clearMessages;
          delete window.MyAICore.getCurrentMessages;
          delete window.MyAICore.setCurrentProject;
        };
      }, [messages]); // Re-run when messages change to keep getCurrentMessages current
      
      // sendVoiceCommand - Main voice/text handler
      const sendVoiceCommand = async () => {
        console.log('[MyAICore] sendVoiceCommand triggered with:', voicePrompt);
        
        if (!voicePrompt || !voicePrompt.trim()) {
          console.log('[MyAICore] Empty prompt, ignoring');
          return;
        }
        
        setIsProcessing(true);
        
        try {
          // IMPORTANT: Store the prompt before clearing it
          const messageContent = voicePrompt.trim();
          
          // Add user message to chat
          const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageContent,
            timestamp: new Date()
          };
          
          setMessages(prev => {
            if (!Array.isArray(prev)) return [userMessage];
            return [...prev, userMessage];
          });
          
          // Clear input immediately
          setVoicePrompt('');
          
          // Build context object
          const context = {
            projectPath: currentProject?.path || null,
            projectName: currentProject?.project || null,
            selectedModel: (()=>{
              const stored = localStorage.getItem('selectedModel');
              // migrate bad defaults → mistral
              if (!stored || stored.startsWith('wizardcoder')) {
                localStorage.setItem('selectedModel', 'mistral:latest');
                return 'mistral:latest';
              }
              return stored;
            })()
          };
          
          console.log('[MyAICore] Sending with context:', context);
          
          // Try to send message
          let response = null;
          
          if (window.electronAPI && window.electronAPI.sendMessage) {
            console.log('[MyAICore] Calling electronAPI.sendMessage with:', messageContent, 'model:', context.selectedModel);
            response = await window.electronAPI.sendMessage(messageContent, context);
          } else if (window.electronAPI && window.electronAPI.chatCompletion) {
            console.log('[MyAICore] Calling electronAPI.chatCompletion');
            response = await window.electronAPI.chatCompletion({
              message: messageContent,
              context: context
            });
          }
          
          // Handle response - extract content if it's an object
          if (response) {
            // Extract content from response object if needed
            const responseContent = typeof response === 'object' && response.content 
              ? response.content 
              : response;
            
            const aiMessage = {
              id: Date.now() + 1,
              type: 'ai',
              content: responseContent,
              timestamp: new Date()
            };
            
            setMessages(prev => {
              if (!Array.isArray(prev)) return [aiMessage];
              return [...prev, aiMessage];
            });
          } else {
            // Fallback message
            const aiMessage = {
              id: Date.now() + 1,
              type: 'ai',
              content: 'Echo: No response from API. Check backend connection.',
              timestamp: new Date()
            };
            
            setMessages(prev => {
              if (!Array.isArray(prev)) return [aiMessage];
              return [...prev, aiMessage];
            });
          }
        } catch (error) {
          console.error('[MyAICore] Voice command error:', error);
          const errorMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: 'Error: ' + (error.message || 'Unknown error'),
            timestamp: new Date()
          };
          setMessages(prev => {
            if (!Array.isArray(prev)) return [errorMessage];
            return [...prev, errorMessage];
          });
        } finally {
          setIsProcessing(false);
        }
      };

      // handleKeyPress - Enter key handler
      const handleKeyPress = (e) => {
        if (e && e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendVoiceCommand();
        }
      };

      // fetchNotes - Load Obsidian notes
      const fetchNotes = async () => {
        console.log('[MyAICore] Fetching notes...');
        try {
          let fetchedNotes = [];
          
          if (window.electronAPI && window.electronAPI.getVaultNotes) {
            fetchedNotes = await window.electronAPI.getVaultNotes();
          } else if (window.electronAPI && window.electronAPI.listNotes) {
            fetchedNotes = await window.electronAPI.listNotes();
          }
          
          setNotes(fetchedNotes || []);
          console.log('[MyAICore] Notes loaded:', fetchedNotes?.length || 0);
        } catch (error) {
          console.error('[MyAICore] Failed to fetch notes:', error);
          setNotes([]);
        }
      };

      // handleMicClick - Microphone button handler
      const handleMicClick = () => {
        console.log('[MyAICore] Mic clicked, isListening:', isListening);
        setIsListening(!isListening);
      };

      // useEffect - Initial data load
      useEffect(() => {
        console.log('[MyAICore] Component mounted');
        fetchNotes();
        
        // Send identity from localStorage to main process
        const aiName = localStorage.getItem('echo_ai_name');
        const userName = localStorage.getItem('echo_user_name');
        
        if (aiName && userName) {
          console.log('[MyAICore] Sending identity to main process:', { aiName, userName });
          window.electronAPI.invoke('identity:set', {
            ai: { name: aiName, role: 'Echo Rubicon AI Assistant' },
            user: { name: userName }
          }).then(() => {
            console.log('[MyAICore] Identity sent successfully');
          }).catch(err => {
            console.error('[MyAICore] Failed to send identity:', err);
          });
        }
        
        return () => {
          console.log('[MyAICore] Component unmounting');
        };
      }, []);

      // Props assembly for MyAIInterface
      const props = {
        // State
        voicePrompt,
        setVoicePrompt,
        messages,
        setMessages,
        isListening,
        setIsListening,
        isProcessing,
        notes,
        selectedNote,
        setSelectedNote,
        currentProject,
        setCurrentProject,
        
        // Handlers
        sendVoiceCommand,
        handleKeyPress,
        handleMicClick,
        fetchNotes,  // Added in case interface needs to refresh
        
        // Panels
        DevPanel: window.DevPanel || (() => createElement('div', null, 'Dev Panel')),
        SettingsPanel: window.SettingsPanel || (() => createElement('div', null, 'Settings Panel')),
        NotesPanel: window.NotesPanel || (() => createElement('div', null, 'Notes Panel')),
        ChatPanel: window.ChatPanel || (() => createElement('div', null, 'Chat Panel')),
      };
      
      console.log('[MyAICore] Rendering with props:', {
        hasCurrentProject: !!currentProject,
        projectName: currentProject?.project
      });
      
      const Component = window.EchoInterface;
      
      if (!Interface) {
        console.error('[MyAICore] MyAIInterface not found!');
        return createElement('div', { 
          style: { 
            color: 'red', 
            padding: '20px',
            textAlign: 'center',
            fontSize: '18px'
          } 
        }, 'MyAIInterface component not loaded');
      }
      
      return createElement(Interface, props);
      
    } catch (error) {
      console.error('[MyAICore] Component error:', error);
      return createElement('div', { 
        style: { 
          color: 'red', 
          padding: '20px',
          textAlign: 'center'
        } 
      }, 'Error: ' + error.message);
    }
  }
  
  // Export to window
  window.MyAICore = MyAICore;
  console.log('[MyAICore] Component registered to window.MyAICore');
  
  // === GLOBAL ERROR TRAPS ===
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('[GLOBAL ERROR]', {
      msg,
      url,
      lineNo,
      columnNo,
      error: error?.stack || error
    });
  };

  window.addEventListener('unhandledrejection', function (event) {
    console.error('[UNHANDLED PROMISE REJECTION]', event.reason?.stack || event.reason);
  });

})();