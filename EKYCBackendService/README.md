# EKYCBackendService

Express-based backend service for the EKYC Suite. It exposes REST APIs for authentication, KYC onboarding, and document uploads, with SQLite for persistence and Swagger docs.

Important: The OpenAPI spec is generated dynamically at runtime from JSDoc comments. Use the live spec at /openapi.json instead of any static files to ensure all routes (including POST /documents) appear correctly.

## Prerequisites
- Node.js 18+ and npm
- (Dev) SQLite is bundled; no external DB setup needed for local use

## Environment Variables

Create a `.env` file in this directory based on `.env.example`.

Required:
- JWT_SECRET: Secret used to sign JWTs. Use a long random string.
- SQLITE_DB_PATH: Path to the SQLite database file (e.g., ./data/app.db).
- PORT: Port for the backend server (e.g., 3001).
- CORS_ORIGIN: Allowed origin for CORS (e.g., http://localhost:3000).

Optional:
- HOST: Host to bind the server (default: 0.0.0.0).
- JWT_EXPIRES_IN: JWT token expiry (default: 1h). Examples: 15m, 1h, 7d.
- UPLOADS_DIR: Base directory for storing uploaded files (default: ./uploads).
- UPLOAD_MAX_BYTES: Max upload size in bytes (default: 10MB).

Example `.env`:
```
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=1h
SQLITE_DB_PATH=./data/app.db
HOST=0.0.0.0
PORT=3001
CORS_ORIGIN=http://localhost:3000
UPLOADS_DIR=./uploads
UPLOAD_MAX_BYTES=10485760
```

## Installation

```
npm install
```

## Database Migrations

Migrations run automatically on server startup, but you can also run them manually:
```
npm run migrate
```

## Run (Development)

```
npm run dev
```

This starts the server with nodemon. By default it listens on:
- Base URL: http://localhost:3001
- API Docs (Swagger UI): http://localhost:3001/docs
- OpenAPI JSON (dynamic): http://localhost:3001/openapi.json

## Run (Production)

```
npm run start
```

## API Overview

- GET / : Health check
- POST /auth/register : Register with email or mobile + password
- POST /auth/login : Login with email or mobile + password
- POST /auth/request-otp : Request mocked OTP
- POST /auth/verify-otp : Verify mocked OTP

KYC (JWT Bearer required):
- GET /kyc/profile, PUT /kyc/profile
- GET /kyc/identity, PUT /kyc/identity
- GET /kyc/address, PUT /kyc/address
- GET /kyc/bank, PUT /kyc/bank
- GET /kyc/onboarding/status

Documents (JWT Bearer required):
- GET /documents: List documents (optional ?category=pan|address|bank|income|nominee|signature|other)
- POST /documents: Upload multipart/form-data with field "file"; optional fields: category, description
- GET /documents/{id}: Get single document metadata
- DELETE /documents/{id}: Delete a document and its stored file

See interactive docs at `/docs`. The OpenAPI spec is served dynamically from the running service at `/openapi.json`. This live spec is generated from the latest route JSDoc annotations and should be used by Swagger UI and any client generators. Any static spec files under interfaces/ are for reference only and may be stale.

## CORS

Set `CORS_ORIGIN` to your frontend origin during development, e.g.:
```
CORS_ORIGIN=http://localhost:3000
```
Using `*` is acceptable for local development but not recommended for production.

## Notes

- Never commit real secrets to version control.
- For production, consider moving from SQLite to a managed relational database and secure secret management.
- Consider adding antivirus scanning and more strict MIME/type validation for uploaded files in production.
