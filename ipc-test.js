// Add this to your renderer console to test IPC
if (window.electronAPI) {
    console.log('ElectronAPI available:', Object.keys(window.electronAPI));
    
    // Test if reload is being intercepted
    window.addEventListener('beforeunload', (e) => {
        console.log('beforeunload event fired');
        debugger; // This will pause if DevTools is open
    });
    
    // Try programmatic reload
    setTimeout(() => {
        console.log('Attempting reload...');
        window.location.reload();
    }, 5000);
} else {
    console.log('ElectronAPI not found - running in browser mode?');
}
