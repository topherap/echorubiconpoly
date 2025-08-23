// DevPanelHotkeyLogic.js
// This file contains the logic for toggling the DevPanel visibility using hotkeys
// It should be imported in your main App.jsx or another appropriate component

import { useState, useEffect } from 'react';

/**
 * Custom hook to handle the DevPanel visibility toggle
 * @returns {Object} - Contains the isDevPanelVisible state and toggleDevPanel function
 */
export function useDevPanel() {
  const [isDevPanelVisible, setIsDevPanelVisible] = useState(false);
  const [devModeCommand, setDevModeCommand] = useState('');
  
  // Toggle DevPanel visibility
  const toggleDevPanel = () => {
    setIsDevPanelVisible(prev => !prev);
  };

  // Handle keyboard events for the hotkey combination (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl+Shift+D
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleDevPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Monitor input in message field for ::devmode command
  useEffect(() => {
    const checkForDevModeCommand = () => {
      if (devModeCommand.trim() === '::devmode') {
        setIsDevPanelVisible(true);
        setDevModeCommand('');
      }
    };

    checkForDevModeCommand();
  }, [devModeCommand]);

  // Function to update the command being typed
  const updateDevModeCommand = (text) => {
    setDevModeCommand(text);
  };

  return {
    isDevPanelVisible,
    toggleDevPanel,
    updateDevModeCommand
  };
}

/**
 * Example of how to use the useDevPanel hook in a parent component
 */
// In your main App.jsx or another component:
/*
import React from 'react';
import DevPanel from './components/DevPanel';
import { useDevPanel } from './utils/DevPanelHotkeyLogic';

function App() {
  const { isDevPanelVisible, toggleDevPanel, updateDevModeCommand } = useDevPanel();
  const [inputText, setInputText] = useState('');
  const [modelStats, setModelStats] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Function to handle text input changes
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    updateDevModeCommand(text);
  };
  
  // Handle various DevPanel actions
  const handleForceSync = () => {
    console.log('Force sync triggered');
    // Implementation...
  };
  
  const handleClearCache = () => {
    console.log('Cache cleared');
    // Implementation...
  };
  
  const handleExportJSON = () => {
    console.log('JSON exported');
    // Implementation...
  };
  
  const toggleAdvanced = () => {
    setShowAdvanced(prev => !prev);
  };
  
  return (
    <div className="app">
      {/* Normal app UI *//*}
      <input 
        type="text" 
        value={inputText} 
        onChange={handleInputChange} 
        placeholder="Type a message..."
      />
      
      {/* DevPanel will only be rendered when isDevPanelVisible is true *//*}
      {isDevPanelVisible && (
        <DevPanel
          modelStats={modelStats}
          onForceSync={handleForceSync}
          onClearCache={handleClearCache}
          debugLogs={debugLogs}
          showAdvanced={showAdvanced}
          toggleAdvanced={toggleAdvanced}
          onExportJSON={handleExportJSON}
        />
      )}
    </div>
  );
}
*/
