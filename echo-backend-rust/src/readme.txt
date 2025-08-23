# Echo Backend - Secure Rust API

A production-ready Rust backend with JWT authentication, role-based access control, and extensible storage.

## 🚀 Features

- **JWT Authentication**: Secure token-based auth with expiration
- **Role-Based Access**: Feature flags and dev mode support
- **Storage Abstraction**: Pluggable storage backends (Memory, JSON, PostgreSQL)
- **SSE Streaming**: Real-time event streaming
- **CORS Support**: Configurable cross-origin requests
- **Dev Mode**: Quick development with pre-generated tokens
- **Fly.io Ready**: Optimized for deployment

## 📋 API Endpoints

### Public Endpoints

- `POST /signup` - Create new user account
- `POST /login` - Authenticate and receive JWT token  
- `GET /health` - Health check for monitoring

### Protected Endpoints (Require JWT)

- `GET /me` - Get current user information
- `POST /message` - Echo message service (requires `chat` feature)
- `GET /stream` - SSE event stream (requires `stream` feature)

### Development Endpoints

- `POST /seed-dev-users` - Seed test users (when `ALLOW_SEED_ENDPOINT=true`)

## 🔧 Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here  # Required for production

# Storage Configuration
USER_STORE_TYPE=memory|json|postgres  # Default: memory
USER_STORE_PATH=users.json           # For json store
DATABASE_URL=postgres://...          # For postgres store

# Development Mode
ECHO_DEV_MODE=true                   # Enable dev mode
ECHO_DEV_TOKEN=<token>              # Auto-inject dev token
SEED_DEV_USERS=true                 # Auto-seed users on startup
ALLOW_SEED_ENDPOINT=true            # Enable /seed-dev-users endpoint

# Server Configuration
PORT=8080                           # Server port
RUST_LOG=debug                      # Logging level
```

## 🛠️ Development Setup

### Quick Start

```bash
# Clone and build
cargo build --release

# Run with dev mode
ECHO_DEV_MODE=true cargo run

# The server will print a dev token on startup
```

### Using Dev Token

```bash
# Copy the dev token from startup logs
DEV_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# Use in requests
curl -H "Authorization: Bearer $DEV_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello"}' \
     http://localhost:8080/message
```

### Test Users

When `SEED_DEV_USERS=true`, these users are created:

| Email | Password | Role | Features |
|-------|----------|------|----------|
| test@example.com | password123 | User | chat, stream |
| premium@example.com | premium123 | Premium | chat, stream, premium |
| dev@example.com | dev123 | Developer | * (all) |
| admin@example.com | admin123 | Admin | * (all) |

## 🔒 Authentication Flow

### 1. Sign Up

```bash
curl -X POST http://localhost:8080/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "email": "user@example.com",
  "is_dev": false,
  "features": ["chat", "stream"]
}
```

### 2. Login

```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

### 3. Use Protected Endpoints

```bash
# Get user info
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/me

# Send message
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello Echo"}' \
     http://localhost:8080/message

# Stream events
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/stream
```

## 🗄️ Storage Backends

### Memory Store (Default)
- In-memory HashMap
- Data lost on restart
- Perfect for development

### JSON File Store
```bash
USER_STORE_TYPE=json USER_STORE_PATH=users.json cargo run
```
- Persists to local file
- Good for small deployments

### PostgreSQL Store
```bash
USER_STORE_TYPE=postgres DATABASE_URL=postgres://user:pass@host/db cargo run
```
- Production-ready
- Scalable
- (Implementation pending)

## 🚢 Deployment (Fly.io)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly deploy

# Set secrets
fly secrets set JWT_SECRET=your-production-secret

# Scale
fly scale count 2
```

## 🧪 Testing

### Unit Tests
```bash
cargo test
```

### Integration Testing with curl
```bash
# Health check
curl http://localhost:8080/health

# Full auth flow
./test_auth_flow.sh
```

### Postman Collection
Import `echo_backend.postman_collection.json` for complete API testing.

## 📝 Feature Flags

Users can have different features enabled:

- `chat` - Access to /message endpoint
- `stream` - Access to /stream endpoint  
- `premium` - Premium features (custom)
- `*` - All features (admin/dev)

## 🔐 Security Notes

1. **JWT Secret**: Always use a strong, unique secret in production
2. **Password Hashing**: Uses Argon2 for secure password storage
3. **Token Expiration**: Tokens expire after 7 days by default
4. **CORS**: Configure for your specific domains in production

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details