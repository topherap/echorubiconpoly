// Handle the security challenge UI
document.addEventListener('DOMContentLoaded', async () => {
    // Load the challenge prompt
    const config = await window.electronAPI.getSecurityConfig();
    document.getElementById('prompt').textContent = config.genesisPair.prompt;
    
    // Handle response
    document.getElementById('response').addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const response = e.target.value;
            const result = await window.electronAPI.verifySecurityPhrase(response);
            
            if (!result.success) {
                document.getElementById('warning').style.display = 'block';
                document.getElementById('warning').textContent = 
                    `Incorrect. ${result.attemptsRemaining} attempts remaining.`;
                e.target.value = '';
                
                if (result.attemptsRemaining === 0) {
                    // Security protocol triggered
                    document.body.innerHTML = '<h1>Access Denied</h1>';
                }
            }
        }
    });
});