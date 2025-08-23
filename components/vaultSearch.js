// SECTION START: SEARCH VAULT FUNCTION
var searchVaultForContext = function(query, callback) {
  console.log('[DEBUG-SEARCH-VAULT] Searching vault and memory for:', query);

  var finalContext = '';
  var memoryProcessed = false;

  // ADD CURRENTLY SELECTED NOTE AS PRIMARY CONTEXT
  if (selectedObsidianNote && obsidianNoteContent && !selectedObsidianNote.startsWith('conversations/')) {
    var noteTitle = selectedObsidianNote.split('/').pop().replace('.md', '').replace(/-/g, ' ');
    noteTitle = noteTitle.replace(/\b\w/g, function(l) { return l.toUpperCase(); });

    var notePreview = obsidianNoteContent.substring(0, 1000);
    if (obsidianNoteContent.length > 1000) {
      notePreview += '...\n[Note truncated for context]';
    }

    finalContext = '=== CURRENTLY VIEWING: ' + noteTitle + ' ===\n' + notePreview + '\n\n';
    console.log('[DEBUG-SEARCH-VAULT] Added current note context:', noteTitle);
  }

  var continueWithVaultSearch = function() {
    if (!window.electronAPI || !window.electronAPI.searchNotes) {
      console.warn('[DEBUG-SEARCH-VAULT] Search API not available');
      callback(finalContext || null);
      return;
    }

    window.electronAPI.searchNotes(query).then(function(searchResult) {
      var results = searchResult.results || [];
      console.log('[DEBUG-SEARCH-RESULT]', 'Full searchResult:', searchResult);
      console.log('[DEBUG-SEARCH-RESULT]', 'Extracted results:', results, 'Length:', results.length);

      if (!results || results.length === 0) {
        console.log('[DEBUG-SEARCH-VAULT] No relevant notes found for:', query);
        finalContext += '\n\n[SYSTEM: No notes found in vault matching: "' + query + '". Do not make up information.]\n\n';
        callback(finalContext);
        return;
      }

      console.log('[DEBUG-SEARCH-VAULT] Found ' + results.length + ' relevant notes');

      var vaultContext = finalContext ? '\n\nInformation from your notes:\n\n' : 'Information from your notes:\n\n';

      var clientFiles = results.filter(function(r) {
        var isClientFile = r.path.includes('clients/') || r.path.includes('clients\\');
        var isUnknown = r.path.toLowerCase().includes('unknown-client');
        var hasMinimalContent = r.content.length < 400;
        return isClientFile && !isUnknown;
      });

      if (clientFiles.length > 0) {
        vaultContext += 'YOUR BUSINESS CLIENTS:\n\n';
        var clientCount = 0;
        clientFiles.forEach(function(result) {
          var pathParts = result.path.split(/[\/\\]/);
          var fileName = pathParts[pathParts.length - 1];
          var clientName = fileName.replace('.md', '');
          if (clientName.toLowerCase().includes('unknown-client')) return;
          clientCount++;
          vaultContext += clientCount + '. CLIENT: ' + clientName + '\n';

          var content = result.content;
          var contentStart = content.lastIndexOf('---');
          if (contentStart > 10) {
            content = content.substring(contentStart + 3).trim();
          }

          if (content && content.length > 10) {
            var lines = content.split('\n').filter(function(line) { return line.trim(); });
            lines.forEach(function(line) {
              vaultContext += '   - ' + line.trim() + '\n';
            });
            vaultContext += '\n';
          }
        });

        if (clientCount === 0) {
          vaultContext += 'No named clients found in the search results.\n';
        }
      }

      if (query.toLowerCase().includes('list') || query.toLowerCase().includes('all')) {
        callback(finalContext + vaultContext);
        return;
      }

      var otherResults = results.filter(function(r) {
        return !r.path.includes('clients') && !r.path.includes('unknown-client');
      }).slice(0, 2);

      if (otherResults.length > 0) {
        vaultContext += '\nRelated information:\n';
        otherResults.forEach(function(result) {
          vaultContext += 'From: ' + result.path + '\n';
          vaultContext += result.content.substring(0, 200) + '...\n\n';
        });
      }

      callback(finalContext + vaultContext);
    }).catch(function(error) {
      console.error('[DEBUG-SEARCH-VAULT] Search error:', error);
      callback(finalContext || null);
    });
  };

  injectMemoryContext(query, finalContext, continueWithVaultSearch);
};

// Export
module.exports = {
  searchVaultForContext
};
