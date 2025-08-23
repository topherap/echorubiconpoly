use crate::auth::Claims;

pub fn has_feature(claims: &Claims, key: &str) -> bool {
    claims.features.contains(&key.to_string()) || claims.features.contains(&"*".to_string())
}