// src/state/vault_state.rs
use std::path::PathBuf;
use std::collections::{HashMap, VecDeque};
use tokio::sync::{broadcast, Mutex};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use crate::vault::{VaultWatcher, VaultIndexer};

#[derive(Debug, Clone)]
pub enum VaultEvent {
    FileCreated(PathBuf),
    FileModified(PathBuf),
    FileDeleted(PathBuf),
    FileRenamed(PathBuf, PathBuf),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfig {
    pub vault_path: String,
    pub vault_structure: VaultStructure,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStructure {
    pub public: String,
    pub private: String,
}

impl Default for VaultConfig {
    fn default() -> Self {
        Self {
            vault_path: "C:\\Users\\tophe\\Documents\\Echo Rubicon\\vault".to_string(),
            vault_structure: VaultStructure {
                public: "Public".to_string(),
                private: "Private".to_string(),
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultMetadata {
    pub title: String,
    pub tags: Vec<String>,
    pub content: String,
    pub last_modified: DateTime<Utc>,
    pub is_public: bool,
}

pub struct VaultState {
    pub vault_path: PathBuf,
    pub indexed_files: HashMap<PathBuf, VaultMetadata>,
    pub pending_files: VecDeque<PathBuf>,
    pub last_scan: Option<DateTime<Utc>>,
    pub watcher: Option<Arc<Mutex<VaultWatcher>>>,
    pub indexer: Option<VaultIndexer>,
    pub event_rx: Option<broadcast::Receiver<VaultEvent>>,
}

impl VaultState {
    pub async fn initialize(config: &VaultConfig) -> Result<Self> {
        let vault_path = PathBuf::from(&config.vault_path);
        
        // Create vault structure if it doesn't exist
        let public_path = vault_path.join(&config.vault_structure.public);
        let private_path = vault_path.join(&config.vault_structure.private);
        let index_path = vault_path.join(".echo-index");
        
        tokio::fs::create_dir_all(&public_path).await?;
        tokio::fs::create_dir_all(&private_path).await?;
        tokio::fs::create_dir_all(&index_path).await?;
        
        println!("VaultState: Initializing at {}", vault_path.display());
        println!("  Public folder: {}", public_path.display());
        println!("  Private folder: {}", private_path.display());
        
        // Initialize watcher
        let (watcher, event_rx) = VaultWatcher::new(&vault_path)?;
        
        // Initialize indexer with background indexing
        let indexer = VaultIndexer::spawn_background(&vault_path).await
            .map_err(|e| anyhow::anyhow!("Failed to create indexer: {}", e))?;
        
        // Since VaultIndexer can't be cloned, we'll handle events differently
        // For now, just comment out the event handling until we refactor VaultIndexer
        
        /* TODO: Refactor to handle events without cloning
        let mut event_rx_clone = watcher.subscribe();
        
        // Spawn task to handle file events
        tokio::spawn(async move {
            while let Ok(event) = event_rx_clone.recv().await {
                match event {
                    VaultEvent::FileCreated(path) | VaultEvent::FileModified(path) => {
                        // Re-index the file
                        if let Err(e) = indexer_clone.index_file(&path).await {
                            eprintln!("Failed to index {}: {}", path.display(), e);
                        }
                    }
                    VaultEvent::FileDeleted(path) => {
                        // Remove from index
                        indexer_clone.remove_from_index(&path).await;
                    }
                    VaultEvent::FileRenamed(old_path, new_path) => {
                        indexer_clone.remove_from_index(&old_path).await;
                        if let Err(e) = indexer_clone.index_file(&new_path).await {
                            eprintln!("Failed to index renamed file {}: {}", new_path.display(), e);
                        }
                    }
                }
            }
        });
        */
        
        Ok(Self {
            vault_path,
            indexed_files: HashMap::new(),
            pending_files: VecDeque::new(),
            last_scan: Some(Utc::now()),
            watcher: Some(Arc::new(Mutex::new(watcher))),
            indexer: Some(indexer),
            event_rx: Some(event_rx),
        })
    }
}