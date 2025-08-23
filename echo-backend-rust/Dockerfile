# Build stage
FROM rust:1.83-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
   pkg-config \
   libssl-dev \
   && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --locked
RUN rm -rf src

# Copy actual source and rebuild
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs
RUN cargo build --release --locked

# Runtime stage  
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
   ca-certificates \
   libssl3 \
   && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/echo-rubicon ./
COPY migrations ./migrations

# Copy production config
COPY config.prod.json ./config.json

EXPOSE 8080
CMD ["./echo-rubicon"]