// =====================
// MyAI.js — Hybrid Bootstrap-Compatible Version (Hook-Safe, Pre-Registered)
// =====================

(function() {
  // Use IIFE to avoid global conflicts
  const React = window.React;
  const createElement = React.createElement; // Avoid 'h' conflict
  const { useState, useEffect, useRef } = React;
  const useAuth = window.useAuth || (() => ({ isAuthenticated: false, setIsAuthenticated: () => {} }));

  const DevPanel = window.DevPanel || (() => null);
  const SettingsPanel = window.SettingsPanel || (() => null);
  const NotesPanel = window.NotesPanel || (() => null);
  const ChatPanel = window.ChatPanel || (() => null);
  const sendVoiceCommand = window.sendVoiceCommand || (() => {});
  
  // In MyAI.js, modify this line:
  const MyAIInterface = window.MyAIRegistry?.components?.MyAIInterface || window.MyAIInterface || (() => createElement('div', null, 'MyAIInterface not loaded'));

  function MyAI() {
    const auth = useAuth();
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

    if (!interfaceReady) {
      return createElement('div', null, '⏳ Loading interface...');
    }

    if (!auth?.isAuthenticated) {
      return createElement(window.AuthChallenge || 'div', {
        onSuccess: () => {
          console.log('[MyAI] Auth success, setting isAuthenticated');
          if (auth.setIsAuthenticated) auth.setIsAuthenticated(true);
        }
      }, '🔐 Loading auth...');
    }

    // Fixed: use createElement instead of undefined 'h'
    return createElement(window.MyAICore || 'div');
  }

  // Clear any pending stub
  if (window.MyAI && window.MyAI.pending) {
    delete window.MyAI.pending;
  }
  
  window.MyAI = MyAI;
  console.log('[MyAI] Registered to window.MyAI from MyAI.js');
  window.dispatchEvent(new Event('myai-ready'));
  console.log('[MyAI] Dispatched myai-ready event');

  // CapsuleRetriever browser-safe registration
  (() => {
    if (!window.myai) window.myai = {};
    if (!window.myai.memory) window.myai.memory = {};

    class CapsuleRetriever {
      constructor(vaultPath, vaultManager = null) {
        this.vaultPath = vaultPath;
        this.vaultManager = vaultManager;
        this.cache = new Map();
      }

      async searchVaultNotes(query, limit) {
        // Placeholder — inject your own vault search logic
        return [];
      }

      scoreRelevance(query, capsule) {
        const queryWords = query.toLowerCase().split(/\s+/);
        const capsuleText = JSON.stringify(capsule).toLowerCase();

        let score = 0;
        for (const word of queryWords) {
          if (capsuleText.includes(word)) score += 1;
        }

        return Math.min(score / queryWords.length, 1.0);
      }

      async getContext(capsuleIds) {
        const capsules = [];

        for (const id of capsuleIds) {
          const cap = await this.getCapsuleById(id);
          if (cap) capsules.push(cap);
        }

        return capsules;
      }

      async getCapsuleById(id) {
        const cap = this.cache.get(id);
        return cap && typeof cap === 'object' && cap.id ? cap : null;
      }
    } // <-- This closing brace was missing!

    try {
      window.myai.memory.CapsuleRetriever = CapsuleRetriever;
      console.log('[CapsuleRetriever] Loaded and registered to window.myai.memory');
    } catch (err) {
      console.error('[CapsuleRetriever] ❌ Failed to register:', err.message);
      window.dispatchEvent(new CustomEvent('capsule-load-failed', { detail: err.message }));
    }
  })();

})(); // End of main IIFE