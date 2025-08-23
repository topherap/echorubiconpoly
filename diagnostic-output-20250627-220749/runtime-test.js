// Runtime Diagnostic Test
console.log('=== RUNTIME DIAGNOSTIC ===');

// 1. Check which checkAuthenticationStatus is active
console.log('\n1. Active Function Check:');
console.log('checkAuthenticationStatus function:', typeof checkAuthenticationStatus);
console.log('Function toString length:', checkAuthenticationStatus ? checkAuthenticationStatus.toString().length : 'N/A');

// 2. Check localStorage state
console.log('\n2. LocalStorage State:');
const authKeys = [
    'echo_auth_session',
    'echo_auth_timestamp',
    'echo_onboarding_complete',
    'echo-app-state',
    'echo_assistant_name',
    'echo_user_name'
];
authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}: ${value ? value.substring(0, 50) + '...' : 'NOT SET'}`);
});

// 3. Check if multiple definitions exist
console.log('\n3. Function Definition Check:');
try {
    // Try to access the function
    const funcString = checkAuthenticationStatus.toString();
    console.log('Function starts with:', funcString.substring(0, 200) + '...');
    
    // Check for key features
    console.log('Contains echo_auth_session check:', funcString.includes('echo_auth_session'));
    console.log('Contains saved session logic:', funcString.includes('savedAuthSession'));
    console.log('Line count:', funcString.split('\n').length);
} catch (e) {
    console.error('Error accessing function:', e);
}

// 4. Test what happens on mount
console.log('\n4. Mount Behavior Test:');
console.log('Current authState:', authState);
console.log('Is authenticated:', authState?.isAuthenticated);

// 5. Try to find the React component
console.log('\n5. Component Check:');
console.log('MyAI component:', typeof MyAI);
console.log('Window.MyAI:', typeof window.MyAI);

// 6. Check for event listeners
console.log('\n6. Event Listeners:');
const listeners = getEventListeners(window);
console.log('beforeunload listeners:', listeners.beforeunload ? listeners.beforeunload.length : 0);

console.log('\n=== END DIAGNOSTIC ===');
