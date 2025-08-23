class VaultInterface {
  constructor(myai) {
    this.myai = myai;
    this.capsulePath = '.echo/capsules';
  }

  async readCapsules(path) {
    try {
      // Get list of capsule files
      const files = await this.listCapsuleFiles();
      const capsules = [];
      
      // Read each capsule file
      for (const file of files) {
        try {
          const content = await this.myai.readNote(file);
          if (content) {
            const capsule = JSON.parse(content);
            capsules.push(capsule);
          }
        } catch (error) {
          console.error('[Vault] Error reading capsule:', file, error);
        }
      }
      
      return capsules;
    } catch (error) {
      console.error('[Vault] Error reading capsules:', error);
      return [];
    }
  }
  
  async listCapsuleFiles() {
    try {
      // Get all notes from vault
      const allNotes = await this.myai.listObsidianNotesAsync();
      
      // Filter for capsule files
      const capsuleFiles = allNotes.filter(note => {
        const notePath = typeof note === 'string' ? note : note.filename;
        return notePath && notePath.startsWith(this.capsulePath) && notePath.endsWith('.json');
      });
      
      return capsuleFiles.map(note => 
        typeof note === 'string' ? note : note.filename
      );
    } catch (error) {
      console.error('[Vault] Error listing capsule files:', error);
      return [];
    }
  }
  
  async saveCapsule(capsule) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();
      const filename = `${this.capsulePath}/${date}/conversation-${timestamp}.json`;
      
      // Ensure directory exists
      await this.ensureDirectory(`${this.capsulePath}/${date}`);
      
      // Save capsule
      const content = JSON.stringify(capsule, null, 2);
      await this.myai.createNote({
        path: filename,
        content: content
      });
      
      console.log('[Vault] Saved capsule:', filename);
      return filename;
    } catch (error) {
      console.error('[Vault] Error saving capsule:', error);
      throw error;
    }
  }
  
  async ensureDirectory(path) {
    // Obsidian creates directories automatically when creating files
    // This is a placeholder for future directory management
    return true;
  }
  
  async saveConversation(messages, capsuleSummary) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();
      const title = messages[0]?.content.slice(0, 50) || 'Untitled Conversation';
      
      // Create markdown content
      const content = [
        '---',
        `title: "${title}"`,
        `date: ${timestamp}`,
        `capsule_summary: "${capsuleSummary}"`,
        'tags: [conversation, echo]',
        '---',
        '',
        '## Summary',
        capsuleSummary,
        '',
        '## Conversation',
        ...messages.map(m => `**${m.role}**: ${m.content}`),
        ''
      ].join('\n');
      
      const filename = `Echo/Conversations/${date}-${Date.now()}.md`;
      
      await this.myai.createNote({
        path: filename,
        content: content
      });
      
      console.log('[Vault] Saved conversation:', filename);
      return filename;
    } catch (error) {
      console.error('[Vault] Error saving conversation:', error);
      throw error;
    }
  }
}

// Module export
window.VaultInterface = VaultInterface;


