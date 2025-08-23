// src/vault/vault_access.rs
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AccessScope {
    Public,
    Private,
    System,
}

pub fn determine_access_scope(path: &Path) -> AccessScope {
    let path_str = path.to_string_lossy();
    
    if path_str.contains("Public") || path_str.contains("public") {
        AccessScope::Public
    } else if path_str.contains("Private") || path_str.contains("private") {
        AccessScope::Private
    } else if path_str.contains(".echo-index") || path_str.starts_with('.') {
        AccessScope::System
    } else {
        // Default to private for safety
        AccessScope::Private
    }
}

pub fn is_accessible(path: &Path, required_scope: AccessScope) -> bool {
    let file_scope = determine_access_scope(path);
    
    match required_scope {
        AccessScope::Public => file_scope == AccessScope::Public,
        AccessScope::Private => file_scope == AccessScope::Public || file_scope == AccessScope::Private,
        AccessScope::System => true, // System scope can access everything
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_access_scope_detection() {
        assert_eq!(
            determine_access_scope(&PathBuf::from("/vault/Public/note.md")),
            AccessScope::Public
        );
        
        assert_eq!(
            determine_access_scope(&PathBuf::from("/vault/Private/secret.md")),
            AccessScope::Private
        );
        
        assert_eq!(
            determine_access_scope(&PathBuf::from("/vault/.echo-index/data")),
            AccessScope::System
        );
    }
}