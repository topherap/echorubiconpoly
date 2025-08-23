// src/vault/mod.rs
pub mod vault_watcher;
pub mod vault_indexer;
pub mod vault_access;

pub use vault_watcher::VaultWatcher;
pub use vault_indexer::VaultIndexer;
pub use vault_access::{AccessScope, determine_access_scope};