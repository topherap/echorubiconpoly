// EchoSettingsPanel.js - Modern Settings System for Echo Rubicon
// Replace the old SettingsPanel-global.js with this file

(function() {
  'use strict';

  console.log("🔧 EchoSettingsPanel.js loading...");

  // Available AI models (NEVER show granite/Q-lib)
  const AVAILABLE_LOCAL_MODELS = [
    { value: 'mistral:latest', label: 'Mistral Latest' },
    { value: 'llama3.1:latest', label: 'Llama 3.1' },
    { value: 'nous-hermes2-mixtral:latest', label: 'Nous Hermes 2 Mixtral' },
    { value: 'command-r7b:latest', label: 'Command R 7B' },
    { value: 'gemma3:12b', label: 'Gemma 3 12B' },
    { value: 'qwen:7b', label: 'Qwen 7B' },
    { value: 'phi3:medium', label: 'Phi 3 Medium' }
  ];

  const AVAILABLE_API_MODELS = {
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
    ],
    google: [
      { value: 'gemini-pro', label: 'Gemini Pro' },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
    ],
    custom: [] // Will be populated by user
  };

  // Available themes from your system
  const AVAILABLE_THEMES = [
    { value: 'white-rabbit', label: '🐇 White Rabbit' },
    { value: 'haiku', label: '🌸 Haiku' },
    { value: 'minimalist-winter', label: '❄️ Minimalist Winter' },
    { value: 'hemingway', label: '📝 Hemingway' }
  ];

  // Default settings configuration
  const DEFAULT_SETTINGS = {
    // Authentication & Registration
    auth: {
      registrationKey: '',
      username: '',
      accountType: 'base', // base/business (determined by key)
      flyBackendUrl: 'https://echo-backend.fly.dev'
    },

    // Primary AI Configuration (user's main assistant)
    primaryAI: {
      useLocal: true,
      localModel: 'mistral:latest',
      apiProvider: null, // 'openai'/'anthropic'/'google'/'custom'
      apiKey: '',
      apiModel: ''
    },

    // Secondary AI (for AI-to-AI conversations)
    secondaryAI: {
      enabled: false, // On/off toggle
      mode: 'local-to-local', // 'local-to-local', 'local-to-api'
      localModel: 'llama3.1:latest',
      apiProvider: 'anthropic',
      apiKey: '',
      apiModel: 'claude-3-haiku-20240307'
    },

    // Custom API Configuration
    customAPI: {
      endpoint: '',
      apiKey: '',
      model: '',
      headers: {} // Additional headers if needed
    },

    // External Service Integrations
    integrations: {
      zapier: { apiKey: '', enabled: false },
      google: { 
        apiKey: '', 
        clientId: '',
        clientSecret: '',
        services: ['drive', 'calendar'], 
        enabled: false 
      },
      obsidian: { 
        vaultPath: 'D:\\Obsidian Vault', 
        syncEnabled: true 
      },
      github: { token: '', enabled: false }
    },

    // Interface & Voice Settings
    interface: {
      voice: {
        tts: true,
        stt: true,
        wakeWord: true,
        voiceModel: 'browser' // 'browser'/'elevenlabs'/'openai'
      },
      theme: 'white-rabbit',
      responsiveMode: true,
      debugMode: false
    },

    // Privacy & Data Management
    privacy: {
      localFirst: true,
      encryptVault: false,
      autoBackup: true,
      dataRetention: '1year', // '30days'/'1year'/'forever'
      anonymousUsage: false
    }
  };

  // Settings persistence layer
  class SettingsManager {
    constructor() {
      this.storageKey = 'echoRubiconSettings';
      this.settings = this.loadSettings();
    }

    loadSettings() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to handle new settings
          return this.mergeWithDefaults(parsed, DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('[Settings] Failed to load settings:', error);
      }
      return { ...DEFAULT_SETTINGS };
    }

    mergeWithDefaults(stored, defaults) {
      const merged = {};
      for (const [key, value] of Object.entries(defaults)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          merged[key] = this.mergeWithDefaults(stored[key] || {}, value);
        } else {
          merged[key] = stored[key] !== undefined ? stored[key] : value;
        }
      }
      return merged;
    }

    saveSettings(newSettings) {
      try {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        console.log('[Settings] Saved successfully');
        
        // Notify system of settings change
        window.dispatchEvent(new CustomEvent('echoSettingsChanged', { 
          detail: this.settings 
        }));
        
        return true;
      } catch (error) {
        console.error('[Settings] Failed to save:', error);
        return false;
      }
    }

    getSetting(path) {
      const keys = path.split('.');
      let value = this.settings;
      for (const key of keys) {
        value = value?.[key];
      }
      return value;
    }

    setSetting(path, newValue) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = this.settings;
      
      // Navigate to parent object
      for (const key of keys) {
        if (!target[key]) target[key] = {};
        target = target[key];
      }
      
      target[lastKey] = newValue;
      return this.saveSettings(this.settings);
    }

    resetToDefaults() {
      this.settings = { ...DEFAULT_SETTINGS };
      return this.saveSettings(this.settings);
    }

    exportSettings() {
      return JSON.stringify(this.settings, null, 2);
    }

    importSettings(jsonString) {
      try {
        const imported = JSON.parse(jsonString);
        const merged = this.mergeWithDefaults(imported, DEFAULT_SETTINGS);
        return this.saveSettings(merged);
      } catch (error) {
        console.error('[Settings] Import failed:', error);
        return false;
      }
    }
  }

  // React Settings Panel Component
  function EchoSettingsPanel({ isOpen, onClose }) {
    const [settings, setSettings] = React.useState(new SettingsManager().settings);
    const [activeTab, setActiveTab] = React.useState('auth');
    const [settingsManager] = React.useState(() => new SettingsManager());

    // Update setting helper
    const updateSetting = (path, value) => {
      settingsManager.setSetting(path, value);
      setSettings({ ...settingsManager.settings });
    };

    // Handle file import
    const handleImportSettings = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (settingsManager.importSettings(e.target.result)) {
            setSettings({ ...settingsManager.settings });
            alert('Settings imported successfully!');
          } else {
            alert('Failed to import settings. Check file format.');
          }
        };
        reader.readAsText(file);
      }
    };

    // Handle export
    const handleExportSettings = () => {
      const dataStr = settingsManager.exportSettings();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `echo-settings-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    };

    if (!isOpen) return null;

    return React.createElement('div', {
      className: 'echo-settings-overlay',
      onClick: onClose
    }, 
      React.createElement('div', {
        className: 'echo-settings-panel',
        onClick: e => e.stopPropagation()
      }, [
        // Header
        React.createElement('div', { 
          key: 'header',
          className: 'echo-settings-header' 
        }, [
          React.createElement('h2', { key: 'title' }, '⚙️ Echo Rubicon Settings'),
          React.createElement('button', {
            key: 'close-btn',
            className: 'echo-close-button',
            onClick: onClose
          }, '×')
        ]),

        // Tab Navigation
        React.createElement('div', { 
          key: 'tabs',
          className: 'echo-settings-tabs' 
        }, [
          ['auth', '🔐 Authentication'],
          ['ai', '🤖 AI Models'], 
          ['integrations', '🔌 Integrations'],
          ['interface', '🎨 Interface'],
          ['privacy', '🛡️ Privacy']
        ].map(([tab, label]) => 
          React.createElement('button', {
            key: tab,
            className: `echo-tab ${activeTab === tab ? 'active' : ''}`,
            onClick: () => setActiveTab(tab)
          }, label)
        )),

        // Content Area
        React.createElement('div', { 
          key: 'content',
          className: 'echo-settings-content' 
        }, [
          // Authentication Tab
          activeTab === 'auth' && React.createElement('div', { key: 'auth-content' }, [
            React.createElement('h3', { key: 'auth-title' }, 'Authentication & Registration'),
            
            React.createElement('div', { key: 'reg-key', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'reg-label' }, 'Registration Key'),
              React.createElement('input', {
                key: 'reg-input',
                type: 'text',
                value: settings.auth.registrationKey,
                onChange: e => {
                  updateSetting('auth.registrationKey', e.target.value);
                  // Auto-determine account type based on key pattern
                  const isBusiness = e.target.value.includes('BUS') || e.target.value.length > 20;
                  updateSetting('auth.accountType', isBusiness ? 'business' : 'base');
                },
                placeholder: 'Enter your Fly.io registration key'
              })
            ]),

            React.createElement('div', { key: 'username', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'user-label' }, 'Username'),
              React.createElement('input', {
                key: 'user-input',
                type: 'text',
                value: settings.auth.username,
                onChange: e => updateSetting('auth.username', e.target.value),
                placeholder: 'Your Echo identity'
              })
            ]),

            React.createElement('div', { key: 'account-type', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'type-label' }, 'Account Type'),
              React.createElement('div', {
                key: 'type-display',
                className: 'echo-account-type-display'
              }, [
                settings.auth.accountType === 'business' ? '💼 Business' : '🏠 Base',
                React.createElement('span', { 
                  key: 'type-note',
                  style: { marginLeft: '10px', fontSize: '12px', color: '#999' }
                }, '(Determined by registration key)')
              ])
            ])
          ]),

          // AI Models Tab
          activeTab === 'ai' && React.createElement('div', { key: 'ai-content' }, [
            React.createElement('h3', { key: 'primary-title' }, 'Primary AI (Your Main Assistant)'),
            
            React.createElement('div', { key: 'primary-local', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'p-local-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'p-local-check',
                  type: 'checkbox',
                  checked: settings.primaryAI.useLocal,
                  onChange: e => updateSetting('primaryAI.useLocal', e.target.checked)
                }),
                ' Use Local Model'
              ])
            ]),

            settings.primaryAI.useLocal ? 
              React.createElement('div', { key: 'primary-model', className: 'echo-form-group' }, [
                React.createElement('label', { key: 'p-model-label' }, 'Local Model'),
                React.createElement('select', {
                  key: 'p-model-select',
                  value: settings.primaryAI.localModel,
                  onChange: e => updateSetting('primaryAI.localModel', e.target.value)
                }, AVAILABLE_LOCAL_MODELS.map(model =>
                  React.createElement('option', { key: model.value, value: model.value }, model.label)
                ))
              ]) :
              React.createElement('div', { key: 'primary-api' }, [
                React.createElement('div', { key: 'p-provider', className: 'echo-form-group' }, [
                  React.createElement('label', { key: 'p-prov-label' }, 'API Provider'),
                  React.createElement('select', {
                    key: 'p-prov-select',
                    value: settings.primaryAI.apiProvider || '',
                    onChange: e => updateSetting('primaryAI.apiProvider', e.target.value)
                  }, [
                    React.createElement('option', { key: 'none', value: '' }, 'Select Provider'),
                    React.createElement('option', { key: 'openai', value: 'openai' }, 'OpenAI'),
                    React.createElement('option', { key: 'anthropic', value: 'anthropic' }, 'Anthropic'),
                    React.createElement('option', { key: 'google', value: 'google' }, 'Google'),
                    React.createElement('option', { key: 'custom', value: 'custom' }, 'Custom API')
                  ])
                ]),

                settings.primaryAI.apiProvider && settings.primaryAI.apiProvider !== 'custom' &&
                React.createElement('div', { key: 'p-model-api', className: 'echo-form-group' }, [
                  React.createElement('label', { key: 'p-model-api-label' }, 'API Model'),
                  React.createElement('select', {
                    key: 'p-model-api-select',
                    value: settings.primaryAI.apiModel,
                    onChange: e => updateSetting('primaryAI.apiModel', e.target.value)
                  }, (AVAILABLE_API_MODELS[settings.primaryAI.apiProvider] || []).map(model =>
                    React.createElement('option', { key: model.value, value: model.value }, model.label)
                  ))
                ]),

                React.createElement('div', { key: 'p-key', className: 'echo-form-group' }, [
                  React.createElement('label', { key: 'p-key-label' }, 'API Key'),
                  React.createElement('input', {
                    key: 'p-key-input',
                    type: 'password',
                    value: settings.primaryAI.apiKey,
                    onChange: e => updateSetting('primaryAI.apiKey', e.target.value),
                    placeholder: 'Enter API key'
                  })
                ])
              ]),

            React.createElement('hr', { key: 'divider' }),

            React.createElement('h3', { key: 'secondary-title' }, 'Secondary AI (For AI-to-AI Conversations)'),
            
            React.createElement('div', { key: 'secondary-enabled', className: 'echo-form-group' }, [
              React.createElement('label', { key: 's-enabled-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 's-enabled-check',
                  type: 'checkbox',
                  checked: settings.secondaryAI.enabled !== false,
                  onChange: e => updateSetting('secondaryAI.enabled', e.target.checked)
                }),
                ' Enable AI-to-AI Conversations'
              ])
            ]),

            (settings.secondaryAI.enabled !== false) && React.createElement('div', { key: 'secondary-mode', className: 'echo-form-group' }, [
              React.createElement('label', { key: 's-mode-label' }, 'Conversation Mode'),
              React.createElement('select', {
                key: 's-mode-select',
                value: settings.secondaryAI.mode,
                onChange: e => updateSetting('secondaryAI.mode', e.target.value)
              }, [
                React.createElement('option', { key: 'local-local', value: 'local-to-local' }, 'Local to Local'),
                React.createElement('option', { key: 'local-api', value: 'local-to-api' }, 'Local to API')
              ])
            ]),

            (settings.secondaryAI.enabled !== false) && React.createElement('div', { key: 'secondary-local-model', className: 'echo-form-group' }, [
              React.createElement('label', { key: 's-local-label' }, 'Secondary Local Model'),
              React.createElement('select', {
                key: 's-local-select',
                value: settings.secondaryAI.localModel,
                onChange: e => updateSetting('secondaryAI.localModel', e.target.value)
              }, AVAILABLE_LOCAL_MODELS.map(model =>
                React.createElement('option', { key: model.value, value: model.value }, model.label)
              ))
            ]),

            (settings.secondaryAI.enabled !== false) && settings.secondaryAI.mode === 'local-to-api' && 
            React.createElement('div', { key: 'secondary-api' }, [
              React.createElement('div', { key: 's-provider', className: 'echo-form-group' }, [
                React.createElement('label', { key: 's-prov-label' }, 'API Provider for Second AI'),
                React.createElement('select', {
                  key: 's-prov-select',
                  value: settings.secondaryAI.apiProvider,
                  onChange: e => updateSetting('secondaryAI.apiProvider', e.target.value)
                }, [
                  React.createElement('option', { key: 'openai', value: 'openai' }, 'OpenAI'),
                  React.createElement('option', { key: 'anthropic', value: 'anthropic' }, 'Anthropic'),
                  React.createElement('option', { key: 'google', value: 'google' }, 'Google')
                ])
              ]),

              React.createElement('div', { key: 's-model-api', className: 'echo-form-group' }, [
                React.createElement('label', { key: 's-model-api-label' }, 'API Model'),
                React.createElement('select', {
                  key: 's-model-api-select',
                  value: settings.secondaryAI.apiModel,
                  onChange: e => updateSetting('secondaryAI.apiModel', e.target.value)
                }, (AVAILABLE_API_MODELS[settings.secondaryAI.apiProvider] || []).map(model =>
                  React.createElement('option', { key: model.value, value: model.value }, model.label)
                ))
              ]),

              React.createElement('div', { key: 's-key', className: 'echo-form-group' }, [
                React.createElement('label', { key: 's-key-label' }, 'API Key'),
                React.createElement('input', {
                  key: 's-key-input',
                  type: 'password',
                  value: settings.secondaryAI.apiKey,
                  onChange: e => updateSetting('secondaryAI.apiKey', e.target.value),
                  placeholder: 'Enter API key for second AI'
                })
              ])
            ]),

            React.createElement('hr', { key: 'divider2' }),

            React.createElement('h3', { key: 'custom-title' }, 'Custom API Configuration'),
            
            React.createElement('div', { key: 'custom-endpoint', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'custom-ep-label' }, 'Custom API Endpoint'),
              React.createElement('input', {
                key: 'custom-ep-input',
                type: 'text',
                value: settings.customAPI.endpoint,
                onChange: e => updateSetting('customAPI.endpoint', e.target.value),
                placeholder: 'https://api.example.com/v1/chat'
              })
            ]),

            React.createElement('div', { key: 'custom-key', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'custom-key-label' }, 'Custom API Key'),
              React.createElement('input', {
                key: 'custom-key-input',
                type: 'password',
                value: settings.customAPI.apiKey,
                onChange: e => updateSetting('customAPI.apiKey', e.target.value),
                placeholder: 'Your custom API key'
              })
            ]),

            React.createElement('div', { key: 'custom-model', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'custom-model-label' }, 'Model Name'),
              React.createElement('input', {
                key: 'custom-model-input',
                type: 'text',
                value: settings.customAPI.model,
                onChange: e => updateSetting('customAPI.model', e.target.value),
                placeholder: 'e.g., custom-model-v1'
              })
            ])
          ]),

          // Integrations Tab
          activeTab === 'integrations' && React.createElement('div', { key: 'int-content' }, [
            React.createElement('h3', { key: 'int-title' }, 'External Service Integrations'),
            
            // Zapier
            React.createElement('div', { key: 'zapier', className: 'echo-integration-section' }, [
              React.createElement('h4', { key: 'zap-title' }, '⚡ Zapier'),
              React.createElement('label', { key: 'zap-enabled', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'zap-check',
                  type: 'checkbox',
                  checked: settings.integrations.zapier.enabled,
                  onChange: e => updateSetting('integrations.zapier.enabled', e.target.checked)
                }),
                ' Enable Zapier Integration'
              ]),
              settings.integrations.zapier.enabled && React.createElement('input', {
                key: 'zap-key',
                type: 'password',
                value: settings.integrations.zapier.apiKey,
                onChange: e => updateSetting('integrations.zapier.apiKey', e.target.value),
                placeholder: 'Zapier API Key',
                style: { marginTop: '10px' }
              })
            ]),

            // Google Services
            React.createElement('div', { key: 'google', className: 'echo-integration-section' }, [
              React.createElement('h4', { key: 'google-title' }, '📊 Google Services'),
              React.createElement('label', { key: 'google-enabled', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'google-check',
                  type: 'checkbox',
                  checked: settings.integrations.google.enabled,
                  onChange: e => updateSetting('integrations.google.enabled', e.target.checked)
                }),
                ' Enable Google Integration'
              ]),
              
              settings.integrations.google.enabled && React.createElement('div', { key: 'google-fields' }, [
                React.createElement('input', {
                  key: 'google-key',
                  type: 'password',
                  value: settings.integrations.google.apiKey,
                  onChange: e => updateSetting('integrations.google.apiKey', e.target.value),
                  placeholder: 'Google API Key',
                  style: { marginTop: '10px', marginBottom: '10px' }
                }),
                React.createElement('input', {
                  key: 'google-client-id',
                  type: 'text',
                  value: settings.integrations.google.clientId,
                  onChange: e => updateSetting('integrations.google.clientId', e.target.value),
                  placeholder: 'Google Client ID',
                  style: { marginBottom: '10px' }
                }),
                React.createElement('input', {
                  key: 'google-client-secret',
                  type: 'password',
                  value: settings.integrations.google.clientSecret,
                  onChange: e => updateSetting('integrations.google.clientSecret', e.target.value),
                  placeholder: 'Google Client Secret'
                })
              ])
            ]),

            // Obsidian
            React.createElement('div', { key: 'obsidian', className: 'echo-integration-section' }, [
              React.createElement('h4', { key: 'obs-title' }, '📝 Obsidian Vault'),
              React.createElement('div', { key: 'obs-path', className: 'echo-form-group' }, [
                React.createElement('label', { key: 'obs-label' }, 'Vault Path'),
                React.createElement('input', {
                  key: 'obs-input',
                  type: 'text',
                  value: settings.integrations.obsidian.vaultPath,
                  onChange: e => updateSetting('integrations.obsidian.vaultPath', e.target.value)
                })
              ]),
              React.createElement('label', { key: 'obs-sync', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'obs-sync-check',
                  type: 'checkbox',
                  checked: settings.integrations.obsidian.syncEnabled,
                  onChange: e => updateSetting('integrations.obsidian.syncEnabled', e.target.checked)
                }),
                ' Enable Auto-Sync'
              ])
            ])
          ]),

          // Interface Tab
          activeTab === 'interface' && React.createElement('div', { key: 'ui-content' }, [
            React.createElement('h3', { key: 'ui-title' }, 'Interface & Voice Settings'),
            
            React.createElement('div', { key: 'voice-section', className: 'echo-form-section' }, [
              React.createElement('h4', { key: 'voice-title' }, '🎤 Voice Settings'),
              
              React.createElement('label', { key: 'tts-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'tts-check',
                  type: 'checkbox',
                  checked: settings.interface.voice.tts,
                  onChange: e => updateSetting('interface.voice.tts', e.target.checked)
                }),
                ' Text-to-Speech (AI reads responses)'
              ]),

              React.createElement('label', { key: 'stt-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'stt-check',
                  type: 'checkbox',
                  checked: settings.interface.voice.stt,
                  onChange: e => updateSetting('interface.voice.stt', e.target.checked)
                }),
                ' Speech-to-Text (Voice input)'
              ]),

              React.createElement('label', { key: 'wake-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'wake-check',
                  type: 'checkbox',
                  checked: settings.interface.voice.wakeWord,
                  onChange: e => updateSetting('interface.voice.wakeWord', e.target.checked)
                }),
                ' Wake Word Detection ("Hi Q")'
              ])
            ]),

            React.createElement('div', { key: 'theme-section', className: 'echo-form-section' }, [
              React.createElement('h4', { key: 'theme-title' }, '🎨 Theme'),
              React.createElement('select', {
                key: 'theme-select',
                value: settings.interface.theme,
                onChange: e => {
                  const newTheme = e.target.value;
                  updateSetting('interface.theme', newTheme);
                  
                  // Method 1: Apply to myai-container directly
                  const containers = document.querySelectorAll('.myai-container');
                  containers.forEach(container => {
                    // Remove all theme classes
                    ['white-rabbit', 'haiku', 'minimalist-winter', 'hemingway'].forEach(theme => {
                      container.classList.remove(theme);
                    });
                    // Add new theme class
                    container.classList.add(newTheme);
                  });
                  
                  // Method 2: Apply to root elements for CSS variable inheritance
                  const root = document.getElementById('myai-root');
                  if (root) {
                    ['white-rabbit', 'haiku', 'minimalist-winter', 'hemingway'].forEach(theme => {
                      root.classList.remove(theme);
                    });
                    root.classList.add(newTheme);
                  }
                  
                  // Method 3: Apply to body and html for complete coverage
                  ['white-rabbit', 'haiku', 'minimalist-winter', 'hemingway'].forEach(theme => {
                    document.body.classList.remove(theme);
                    document.documentElement.classList.remove(theme);
                  });
                  document.body.classList.add(newTheme);
                  document.documentElement.classList.add(newTheme);
                  
                  // Save to localStorage
                  localStorage.setItem('theme', newTheme);
                  
                  // Method 4: Force React component update via event
                  window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
                  
                  // Method 5: Try to update React state directly if component is available
                  if (window.updateEchoTheme) {
                    window.updateEchoTheme(newTheme);
                  }
                }
              }, AVAILABLE_THEMES.map(theme =>
                React.createElement('option', { key: theme.value, value: theme.value }, theme.label)
              ))
            ]),

            React.createElement('div', { key: 'ui-options', className: 'echo-form-section' }, [
              React.createElement('h4', { key: 'ui-opt-title' }, '⚙️ Interface Options'),
              
              React.createElement('label', { key: 'responsive-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'responsive-check',
                  type: 'checkbox',
                  checked: settings.interface.responsiveMode,
                  onChange: e => updateSetting('interface.responsiveMode', e.target.checked)
                }),
                ' Responsive Mode (Adapt to screen size)'
              ]),

              React.createElement('label', { key: 'debug-label', className: 'echo-checkbox-label' }, [
                React.createElement('input', {
                  key: 'debug-check',
                  type: 'checkbox',
                  checked: settings.interface.debugMode,
                  onChange: e => updateSetting('interface.debugMode', e.target.checked)
                }),
                ' Debug Mode (Show console logs)'
              ])
            ])
          ]),

          // Privacy Tab
          activeTab === 'privacy' && React.createElement('div', { key: 'privacy-content' }, [
            React.createElement('h3', { key: 'privacy-title' }, 'Privacy & Data Management'),
            
            React.createElement('label', { key: 'local-label', className: 'echo-checkbox-label' }, [
              React.createElement('input', {
                key: 'local-check',
                type: 'checkbox',
                checked: settings.privacy.localFirst,
                onChange: e => updateSetting('privacy.localFirst', e.target.checked)
              }),
              ' Local-First Processing (Keep data on your machine)'
            ]),

            React.createElement('label', { key: 'encrypt-label', className: 'echo-checkbox-label' }, [
              React.createElement('input', {
                key: 'encrypt-check',
                type: 'checkbox',
                checked: settings.privacy.encryptVault,
                onChange: e => updateSetting('privacy.encryptVault', e.target.checked)
              }),
              ' Encrypt Vault Data'
            ]),

            React.createElement('div', { key: 'retention', className: 'echo-form-group' }, [
              React.createElement('label', { key: 'ret-label' }, 'Data Retention'),
              React.createElement('select', {
                key: 'ret-select',
                value: settings.privacy.dataRetention,
                onChange: e => updateSetting('privacy.dataRetention', e.target.value)
              }, [
                React.createElement('option', { key: '30days', value: '30days' }, '30 Days'),
                React.createElement('option', { key: '1year', value: '1year' }, '1 Year'),
                React.createElement('option', { key: 'forever', value: 'forever' }, 'Forever')
              ])
            ])
          ])
        ]),

        // Footer Actions
        React.createElement('div', { 
          key: 'footer',
          className: 'echo-settings-footer' 
        }, [
          React.createElement('div', { key: 'left-actions' }, [
            React.createElement('button', {
              key: 'export',
              className: 'echo-btn echo-btn-secondary',
              onClick: handleExportSettings
            }, '📥 Export Settings'),
            
            React.createElement('input', {
              key: 'import-input',
              type: 'file',
              accept: '.json',
              onChange: handleImportSettings,
              style: { display: 'none' },
              id: 'import-settings'
            }),
            React.createElement('button', {
              key: 'import',
              className: 'echo-btn echo-btn-secondary',
              onClick: () => document.getElementById('import-settings').click()
            }, '📤 Import Settings')
          ]),

          React.createElement('div', { key: 'right-actions' }, [
            React.createElement('button', {
              key: 'reset',
              className: 'echo-btn echo-btn-danger',
              onClick: () => {
                if (confirm('Reset all settings to defaults?')) {
                  settingsManager.resetToDefaults();
                  setSettings({ ...settingsManager.settings });
                }
              }
            }, 'Reset to Defaults'),
            
            React.createElement('button', {
              key: 'save',
              className: 'echo-btn echo-btn-primary',
              onClick: onClose
            }, 'Save & Close')
          ])
        ])
      ])
    );
  }

  // Settings Panel Manager
  class EchoSettingsPanelManager {
    constructor() {
      this.isOpen = false;
      this.container = null;
    }

    init() {
      console.log('🔧 EchoSettingsPanel.init() called');
      
      if (typeof document === 'undefined') {
        console.error('[EchoSettings] No document object available');
        return;
      }

      if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        console.error('[EchoSettings] React not available');
        return;
      }

      // Close existing panel if open
      this.close();

      // Create container
      this.container = document.createElement('div');
      this.container.id = 'echo-settings-container';
      document.body.appendChild(this.container);

      // Add styles if not present
      this.addStyles();

      // Render panel
      this.isOpen = true;
      ReactDOM.render(
        React.createElement(EchoSettingsPanel, {
          isOpen: true,
          onClose: () => this.close()
        }),
        this.container
      );

      console.log('✅ EchoSettingsPanel rendered successfully');
    }

    close() {
      if (this.container) {
        ReactDOM.unmountComponentAtNode(this.container);
        this.container.remove();
        this.container = null;
      }
      this.isOpen = false;
      console.log('✅ EchoSettingsPanel closed');
    }

    addStyles() {
      if (document.getElementById('echo-settings-styles')) return;

      const style = document.createElement('style');
      style.id = 'echo-settings-styles';
      style.textContent = `
        .echo-settings-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease-out;
        }

        .echo-settings-panel {
          background: var(--bg-primary, #928f8fff);
          color: var(--text-primary, #e0e0e0);
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.3s ease-out;
          display: flex;
          flex-direction: column;
        }

        .echo-settings-header {
          background: var(--bg-secondary, #2a2a2a);
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #3a3a3a);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }

        .echo-settings-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: var(--text-primary, #fff);
        }

        .echo-close-button {
          background: none;
          border: none;
          color: #999;
          font-size: 2rem;
          cursor: pointer;
          padding: 0;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .echo-close-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .echo-settings-tabs {
          display: flex;
          background: var(--bg-secondary, #2a2a2a);
          border-bottom: 1px solid var(--border-color, #3a3a3a);
          flex-shrink: 0;
        }

        .echo-tab {
          flex: 1;
          padding: 15px 10px;
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
        }

        .echo-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ccc;
        }

        .echo-tab.active {
          background: var(--accent-color, #0066cc);
          color: white;
        }

        .echo-settings-content {
          padding: 30px;
          overflow-y: auto;
          flex: 1;
        }

        .echo-settings-content h3 {
          margin: 0 0 20px 0;
          color: var(--text-primary, #fff);
          font-size: 1.2rem;
        }

        .echo-settings-content h4 {
          margin: 20px 0 10px 0;
          color: var(--text-secondary, #ccc);
          font-size: 1rem;
        }

        .echo-form-group {
          margin-bottom: 20px;
        }

        .echo-form-group label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-secondary, #ccc);
          font-weight: 500;
        }

        .echo-form-group input,
        .echo-form-group select {
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary, #333);
          border: 1px solid var(--border-color, #444);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .echo-form-group input:focus,
        .echo-form-group select:focus {
          outline: none;
          border-color: var(--accent-color, #0066cc);
        }

        .echo-checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          margin-bottom: 15px !important;
        }

        .echo-checkbox-label input[type="checkbox"] {
          width: auto !important;
          margin: 0 !important;
        }

        .echo-account-type-display {
          padding: 12px;
          background: var(--bg-tertiary, #333);
          border: 1px solid var(--border-color, #444);
          border-radius: 6px;
          font-size: 16px;
        }

        .echo-form-section {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color, #333);
        }

        .echo-integration-section {
          margin-bottom: 25px;
          padding: 20px;
          background: var(--bg-tertiary, #2a2a2a);
          border-radius: 8px;
        }

        .echo-settings-footer {
          background: var(--bg-secondary, #2a2a2a);
          padding: 20px;
          border-top: 1px solid var(--border-color, #3a3a3a);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }

        .echo-settings-footer > div {
          display: flex;
          gap: 10px;
        }

        .echo-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .echo-btn-primary {
          background: var(--accent-color, #0066cc);
          color: white;
        }

        .echo-btn-primary:hover {
          background: var(--accent-hover, #0052a3);
        }

        .echo-btn-secondary {
          background: var(--bg-tertiary, #444);
          color: var(--text-primary, #fff);
        }

        .echo-btn-secondary:hover {
          background: var(--bg-quaternary, #555);
        }

        .echo-btn-danger {
          background: #dc3545;
          color: white;
        }

        .echo-btn-danger:hover {
          background: #c82333;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Scrollbar styling */
        .echo-settings-content::-webkit-scrollbar {
          width: 8px;
        }

        .echo-settings-content::-webkit-scrollbar-track {
          background: var(--bg-secondary, #2a2a2a);
        }

        .echo-settings-content::-webkit-scrollbar-thumb {
          background: var(--border-color, #444);
          border-radius: 4px;
        }

        .echo-settings-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary, #666);
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Initialize when React is ready
  function initializeWhenReady() {
    if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
      const manager = new EchoSettingsPanelManager();
      
      // Expose globally
      window.EchoSettings = {
        init: () => manager.init(),
        close: () => manager.close(),
        getSettings: () => new SettingsManager().settings,
        updateSetting: (path, value) => new SettingsManager().setSetting(path, value)
      };

      // Also expose as SettingsPanel for backward compatibility
      window.SettingsPanel = window.EchoSettings;

      console.log('✅ EchoSettingsPanel initialized and ready');
      return true;
    }
    return false;
  }

  // Try immediate initialization
  if (!initializeWhenReady()) {
    // Wait for React
    const checkInterval = setInterval(() => {
      if (initializeWhenReady()) {
        clearInterval(checkInterval);
      }
    }, 50);

    // Timeout fallback
    setTimeout(() => {
      if (!window.EchoSettings) {
        console.error('⌛ EchoSettingsPanel initialization timed out');
        clearInterval(checkInterval);
      }
    }, 5000);
  }

})();