# 🧠 Echo Rubicon – Memory System Blueprint

### 📅 Generated: Phase III – Full Flowmap Analysis

Each module is mapped below with its role, status, and connections.

## `MemoryCapsule.js`
- **Role**: data-structure
- **Status**: ✅ live
- **Connections**: 0

## `MemoryVaultManager.js`
- **Role**: storage/indexer
- **Status**: ✅ live
- **Connections**: 0

## `PromptBuilder.js`
- **Role**: prompt-generator
- **Status**: ✅ live
- **Connections**: 0

## `SessionStitcher.js`
- **Role**: session-tracker
- **Status**: ✅ live
- **Connections**: 0

## `TokenBudgetManager.js`
- **Role**: token-budget
- **Status**: ✅ live
- **Connections**: 0

## `vault.js`
- **Role**: obsidian-interface
- **Status**: ✅ live
- **Connections**: 0

## `ChatOrchestrator.js`
- **Role**: core-orchestrator
- **Status**: ✅ live
- **Connections**: 4
  - → `MemoryVaultManager.js`
  - → `PromptBuilder.js`
  - → `SessionStitcher.js`
  - → `TokenBudgetManager.js`

## `context.js`
- **Role**: context-selector
- **Status**: ✅ live
- **Connections**: 0

## `index.js`
- **Role**: entrypoint
- **Status**: ✅ live
- **Connections**: 3
  - → `MemoryCapsule.js`
  - → `MemoryVaultManager.js`
  - → `context.js`

## `integration.js`
- **Role**: system-initializer
- **Status**: ✅ live
- **Connections**: 2
  - → `index.js`
  - → `vault.js`

