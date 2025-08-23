// src/state/mod.rs
pub mod runtime;
pub mod vault_state;

pub use runtime::{RuntimeState, RuntimeConfig};
pub use vault_state::{VaultState, VaultConfig, VaultStructure};

// Re-export VoiceTier from models
pub use crate::models::tts::VoiceTier;