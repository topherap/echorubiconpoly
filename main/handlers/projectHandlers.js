// main/handlers/projectHandlers.js
const fs = require('../../src/memory/fsReplacement'); // REDIRECTED TO QLIB
const path = require('path');

// Get vault path (import from your existing setup)
function getVaultPath() {
  const store = require('../store').store;
  return store.get('vaultPath') || 'D:\\Obsidian Vault';
}

// List all projects in vault
async function listProjects() {
  const vaultPath = getVaultPath();
  const projectsPath = path.join(vaultPath, '.echo', 'projects');
  
  try {
    const projects = await fs.readdir(projectsPath, { withFileTypes: true });
    const projectList = projects
      .filter(d => d.isDirectory())
      .map(d => ({
        name: d.name,
        path: path.join(projectsPath, d.name),
        capsulePath: path.join(projectsPath, d.name, 'capsules')
      }));
    
    console.log('[PROJECT HANDLER] Found projects:', projectList.map(p => p.name));
    return { success: true, projects: projectList };
  } catch (err) {
    console.error('[PROJECT HANDLER] Error listing projects:', err);
    return { success: false, error: err.message, projects: [] };
  }
}

// Get capsule count for a project
async function getProjectStats(projectName) {
  const vaultPath = getVaultPath();
  const capsulePath = path.join(vaultPath, '.echo', 'projects', projectName, 'capsules');
  
  try {
    const files = await fs.readdir(capsulePath, { recursive: true });
    const capsules = files.filter(f => f.endsWith('.json'));
    
    return {
      success: true,
      project: projectName,
      capsuleCount: capsules.length
    };
  } catch (err) {
    return {
      success: false,
      project: projectName,
      error: err.message
    };
  }
}

module.exports = {
  listProjects,
  getProjectStats
};

