// src/vault/vault_watcher.rs
use std::path::{Path, PathBuf};
use std::sync::Arc;
use notify::{Watcher, RecursiveMode, Event, EventKind};
use tokio::sync::{broadcast, Mutex};
use tracing::{info, error};
use anyhow::Result;

use crate::state::vault_state::VaultEvent;

pub struct VaultWatcher {
    watcher: Arc<Mutex<Box<dyn Watcher + Send>>>,
    event_tx: broadcast::Sender<VaultEvent>,
}

impl VaultWatcher {
    pub fn new(vault_path: &Path) -> Result<(Self, broadcast::Receiver<VaultEvent>)> {
        let (event_tx, event_rx) = broadcast::channel(1024);
        let tx_clone = event_tx.clone();
        
        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    let vault_event = match event.kind {
                        EventKind::Create(_) => {
                            event.paths.first().map(|p| VaultEvent::FileCreated(p.clone()))
                        }
                        EventKind::Modify(_) => {
                            event.paths.first().map(|p| VaultEvent::FileModified(p.clone()))
                        }
                        EventKind::Remove(_) => {
                            event.paths.first().map(|p| VaultEvent::FileDeleted(p.clone()))
                        }
                        _ => None,
                    };
                    
                    if let Some(vault_event) = vault_event {
                        let _ = tx_clone.send(vault_event);
                    }
                }
                Err(e) => error!("Watch error: {:?}", e),
            }
        })?;
        
        watcher.watch(vault_path, RecursiveMode::Recursive)?;
        info!("Started watching vault at: {}", vault_path.display());
        
        let watcher = Self {
            watcher: Arc::new(Mutex::new(Box::new(watcher))),
            event_tx,
        };
        
        Ok((watcher, event_rx))
    }

    pub fn subscribe(&self) -> broadcast::Receiver<VaultEvent> {
        self.event_tx.subscribe()
    }

    pub async fn stop(&self) -> Result<()> {
        // Watcher automatically stops when dropped
        info!("Stopping vault watcher");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_vault_watcher_creation() {
        let temp_dir = TempDir::new().unwrap();
        let result = VaultWatcher::new(temp_dir.path());
        assert!(result.is_ok());
    }
}