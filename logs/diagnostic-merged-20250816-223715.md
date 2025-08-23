=== ECHO RUBICON MEMORY PIPELINE DIAGNOSTIC ===

1. FRONTEND PIPELINE CHECK:
---------------------------
✓ preload.js exists
  - qlibExtract exposed: ✓
  - invoke method exposed: ✓

✓ MyAI-global.js exists
  - Calls qlib-extract: ✗
  - Has buildVaultContext: ✗
  - Variable 'userInput': ✓ Not found (good)

2. IPC HANDLERS CHECK:
----------------------
✓ ipc-handlers.js exists
  - Has qlib-extract handler: ✓
  - MemoryService imported: ✓
  - memoryService initialized: ✓

3. MEMORY SERVICE CHECK:
------------------------
✓ MemoryService.js exists
  - Has extractRelevantMemory: ✓
  - Has callQLib method: ✓
  - Uses QLIB_MODEL: ✓

4. QLIB MODULE CHECK:
---------------------
✓ Found QLib at: ./src/QLib.js

5. API WRAPPER CHECK:
--------------------
✓ api-wrapper.js exists
  - Has apiCall function: ✓

6. VAULT SEARCH CHECK:
---------------------
  - search-vault handler: ✗
  - search-notes handler: ✓
  - vault:count handler: ✗

7. PIPELINE FLOW SUMMARY:
-------------------------
Frontend → IPC → MemoryService → Ollama (Q-Lib model)

BREAKS DETECTED:
- No obvious breaks detected

=== END DIAGNOSTIC ===
 
--------------------------- 
Running master-diag-lite.js... 
