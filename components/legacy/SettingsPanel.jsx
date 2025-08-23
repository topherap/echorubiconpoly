import React, { useState, useEffect } from 'react';

export default function SettingsPanel({ isOpen, onClose }) {
  const [vaultPath, setVaultPath] = useState('');
  const [validVaults, setValidVaults] = useState([]);
  const [openAIKey, setOpenAIKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [userName, setUserName] = useState('');
  const [aiMode, setAIMode] = useState('local');
  const [modelOptions, setModelOptions] = useState({ cloud: [], local: [] });
  const [selectedModel, setSelectedModel] = useState('');
  const [devMode, setDevMode] = useState(false);
  const appVersion = 'v0.4-dev';

  const persistConfig = async (updates) => {
    try {
      const currentConfig = await window.electronAPI.configAPI.getConfig();
      const newConfig = { ...currentConfig, ...updates };
      await window.electronAPI.configAPI.setConfig(newConfig);
    } catch (err) {
      console.error('Failed to persist config:', err);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const config = await window.electronAPI.configAPI.getConfig();
        setVaultPath(config.vaultPath || '');
        setOpenAIKey(config.openAIKey || '');
        setAnthropicKey(config.anthropicKey || '');
        setUserName(config.userName || '');
        setAIMode(config.aiMode || 'local');
        setSelectedModel(config.selectedModel || '');
        setDevMode(config.devMode || false);

        const path = await window.vaultAPI.getVaultPath();
        if (path) setVaultPath(path);
        const vaults = await window.vaultAPI.getValidVaults();
        setValidVaults(vaults);

        const options = await window.modelAPI.getModelOptions();
        setModelOptions(options);
        if (config.selectedModel) {
          setSelectedModel(config.selectedModel);
        } else if (options.local.length > 0) {
          setSelectedModel(options.local[0].value);
        } else if (options.cloud.length > 0) {
          setAIMode('cloud');
          setSelectedModel(options.cloud[0].value);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleVaultChange = async (e) => {
    const newPath = e.target.value;
    setVaultPath(newPath);
    try {
      await window.vaultAPI.setVaultPath(newPath);
      await persistConfig({ vaultPath: newPath });
    } catch (err) {
      console.error('Failed to set vault path:', err);
    }
  };

  const handleSaveAPIKeys = async () => {
    try {
      await persistConfig({ openAIKey, anthropicKey });
      console.log('API keys saved');
    } catch (err) {
      console.error('Failed to save API keys:', err);
    }
  };

  const handleUserNameChange = async (e) => {
    const newName = e.target.value;
    setUserName(newName);
    await persistConfig({ userName: newName });
  };

  const handleAIModeChange = async (e) => {
    const newMode = e.target.value;
    setAIMode(newMode);
    const options = newMode === 'cloud' ? modelOptions.cloud : modelOptions.local;
    let newModel = '';
    if (options.length > 0) {
      newModel = options[0].value;
      setSelectedModel(newModel);
      const model = options[0];
      window.ipcRenderer.send('set-active-model', {
        value: model.value,
        label: model.label,
      });
    }
    await persistConfig({ aiMode: newMode, selectedModel: newModel });
  };

  const handleModelChange = async (e) => {
    const modelValue = e.target.value;
    setSelectedModel(modelValue);
    const model = [...modelOptions.cloud, ...modelOptions.local].find(
      (m) => m.value === modelValue
    );
    if (model) {
      window.ipcRenderer.send('set-active-model', {
        value: model.value,
        label: model.label,
      });
      await persistConfig({ selectedModel: modelValue });
    }
  };

  const handleDevModeChange = async (e) => {
    const newDevMode = e.target.checked;
    setDevMode(newDevMode);
    await persistConfig({ devMode: newDevMode });
  };

  const handleReloadVaultIndex = async () => {
    try {
      await window.vaultAPI.getVaultIndex();
      console.log('Vault index reloaded');
    } catch (err) {
      console.error('Failed to reload vault index:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 w-full max-w-2xl text-primary">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-primary"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Vault Configuration</h3>
          <div className="bg-surface p-4 rounded">
            <label className="block text-sm mb-1">Active Vault</label>
            <select
              value={vaultPath}
              onChange={handleVaultChange}
              className="w-full bg-gray-600 rounded p-2 text-primary"
            >
              {validVaults.map((vault) => (
                <option key={vault} value={vault}>
                  {vault}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">API Keys</h3>
          <div className="bg-surface p-4 rounded">
            <div className="mb-2">
              <label className="block text-sm mb-1">OpenAI API Key</label>
              <input
                type="password"
                value={openAIKey}
                onChange={(e) => setOpenAIKey(e.target.value)}
                className="w-full bg-gray-600 rounded p-2 text-primary"
                placeholder="Enter OpenAI API key"
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm mb-1">Anthropic API Key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-gray-600 rounded p-2 text-primary"
                placeholder="Enter Anthropic API key"
              />
            </div>
            <button
              onClick={handleSaveAPIKeys}
              className="bg-blue-600 hover:bg-blue-700 rounded p-2 text-primary"
            >
              Save API Keys
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">User Identity</h3>
          <div className="bg-surface p-4 rounded">
            <div className="mb-2">
              <label className="block text-sm mb-1">Name or Alias</label>
              <input
                type="text"
                value={userName}
                onChange={handleUserNameChange}
                className="w-full bg-gray-600 rounded p-2 text-primary"
                placeholder="Enter your name or alias"
              />
            </div>
            {userName && <p className="text-sm">Signed in as: {userName}</p>}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">AI Model Selection</h3>
          <div className="bg-surface p-4 rounded">
            <div className="mb-2">
              <label className="block text-sm mb-1">AI Mode</label>
              <select
                value={aiMode}
                onChange={handleAIModeChange}
                className="w-full bg-gray-600 rounded p-2 text-primary"
              >
                <option value="local">Local</option>
                <option value="cloud">Cloud</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-sm mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={handleModelChange}
                className="w-full bg-gray-600 rounded p-2 text-primary"
              >
                {(aiMode === 'cloud' ? modelOptions.cloud : modelOptions.local).map(
                  (model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Dev Tools</h3>
          <div className="bg-surface p-4 rounded">
            <div className="flex items-center mb-2">
              <label className="text-sm mr-2">Developer Mode</label>
              <input
                type="checkbox"
                checked={devMode}
                onChange={handleDevModeChange}
                className="toggle-checkbox"
              />
            </div>
            <p className="text-sm mb-2">App Version: {appVersion}</p>
            {devMode && (
              <div className="bg-gray-600 p-2 rounded">
                <p className="text-sm">Benchmark Tools (Placeholder)</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">System Tools</h3>
          <div className="bg-surface p-4 rounded">
            <button
              onClick={handleReloadVaultIndex}
              className="bg-blue-600 hover:bg-blue-700 rounded p-2 text-primary"
            >
              Reload Vault Index
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}