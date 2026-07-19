# 🔐 Secrets Manager

**Store your application secrets encrypted in a local MongoDB database — never in a plaintext `.env` file.**

Secrets Manager is a standalone Node.js tool that you copy into any project folder. It replaces `.env` files with an AES-256-GCM encrypted database, so real secret values never sit in a plaintext file anywhere in your workspace where an AI coding tool, teammate, or accidental commit could read them.

---

## Table of Contents

1. [What This Tool Does & Why](#1-what-this-tool-does--why)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Generate Your Encryption Key](#4-generate-your-encryption-key)
5. [Set Admin Credentials](#5-set-admin-credentials)
6. [Import an Existing .env File](#6-import-an-existing-env-file)
7. [Add a Single Secret via CLI](#7-add-a-single-secret-via-cli)
8. [Start the Admin Web UI](#8-start-the-admin-web-ui)
9. [Using the Web UI](#9-using-the-web-ui)
10. [Wire Into Your Application](#10-wire-into-your-application)
11. [.env.example — Safe to Commit](#11-envexample--safe-to-commit)
12. [Troubleshooting](#12-troubleshooting)
13. [Security Notes](#13-security-notes)

---

## Quick Start

Get up and running in 5 minutes:

1. **Copy** `secrets-manager/` into your project
2. **Install** deps: `cd secrets-manager && npm install`
3. **Generate** an encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. **Set** the key:
   - **Option A (recommended):** Add to your shell profile:
     ```bash
     export ENCRYPTION_KEY="<your-64-char-hex-key>"
     ```
   - **Option B (fast):** Copy `.env.example` to `.env` inside the `secrets-manager` folder and update the values if you don't want to use shell environment variables.
5. **Start** MongoDB locally on port `27017`
6. **Launch** the admin UI:
   ```bash
   cd secrets-manager && npm run ui
   ```
7. **Open** `http://127.0.0.1:4321` in your browser
8. **Log in** with `admin` / `admin` (or your custom credentials)
9. **Add** secrets via the UI, or import an existing `.env` file
10. **Use** in your app by adding at the top of your entry file:
    ```javascript
    (async () => {
      await require('./secrets-manager/src/loader/loadSecrets')();
      // start your app
    })();
    ```

> **Tip:** For existing projects with a `.env` file, run `npm run import-env -- ../.env` to migrate all secrets at once.

---

## 1. What This Tool Does & Why

**The problem:** Traditional `.env` files store API keys, database passwords, and other secrets as plaintext on your filesystem. Any AI coding tool, teammate, or accidental `git push` can expose them.

**The solution:** Secrets Manager stores your secrets encrypted (AES-256-GCM) in a local MongoDB database. The only thing on your filesystem is this tool folder. When your app starts, it loads the secrets from MongoDB, decrypts them in memory, and sets them as `process.env` variables — just like a `.env` file would, but without the plaintext file.

**Key features:**
- 🔒 AES-256-GCM encryption with unique IV per secret
- 🖥️ Admin web UI with masked values and per-row reveal
- 📥 CLI tools for importing `.env` files and adding secrets
- 📄 Auto-generates `.env.example` from your stored keys (safe to commit)
- 🔌 Drop-in `require()` in your app's entry file
- 📤 Export secrets to `.env.development` or `.env.production` files
- ✅ Input validation — keys must contain only letters, numbers, and underscores
- 🧹 Auto-trimming — all keys and values are trimmed before saving

---

## 2. Prerequisites

- **Node.js** (v16 or later)
- **MongoDB** running locally on the default port (27017)

### Minimum Requirements

| Requirement | Details |
|-------------|---------|
| Node.js | v16 or later |
| MongoDB | Local instance on port 27017 |
| ENCRYPTION_KEY | 64-character hex string, set in shell profile |
| Disk space | ~10MB for tool + MongoDB storage |
| RAM | 50MB+ for Node + MongoDB |

> **Note:** The admin UI binds to `127.0.0.1` only. No network exposure. No cloud services required.

### Required Environment Variables

Before running secrets-manager, you must set:

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | **Yes** | 64-char hex string used to encrypt/decrypt secrets |
| `ADMIN_USER` | No | Admin UI username (default: `admin`) |
| `ADMIN_PASSWORD` | No | Admin UI password (default: `admin`) |
| `PROJECT_NAME` | No | MongoDB database name (default: `secrets-manager`) |
| `PORT` | No | Admin UI port (default: `4321`) |

**Only `ENCRYPTION_KEY` is mandatory.** Without it, the tool will refuse to start.

### Installing MongoDB

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu / Debian (apt):**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Windows:**
1. Download the MongoDB Community Server installer from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run the installer and choose "Complete" setup
3. MongoDB will be installed and started as a Windows service automatically

Verify MongoDB is running:
```bash
mongosh
# or
mongo
```

---

## 3. Installation

Copy the `secrets-manager` folder into your existing project:

```
myapp/
├── src/
├── package.json
└── secrets-manager/     ← copy here
    ├── package.json
    ├── src/
    ├── cli/
    └── public/
```

Then install dependencies inside the `secrets-manager` folder:

```bash
cd secrets-manager
npm install
```

That's it. No global installs, no configuration files to edit.

---

## 🚀 Local Development Workflow

Secrets Manager is designed **ONLY for local development**. It provides a secure, encrypted alternative to plaintext `.env` files that could otherwise leak secrets to version control or AI coding tools.

### How Developers Use It

1. **Copy** the `secrets-manager/` folder into your project repository
2. **Install** dependencies: `cd secrets-manager && npm install`
3. **Generate** your own unique `ENCRYPTION_KEY` (do NOT share with teammates)
4. **Run** the admin UI: `npm run ui`
5. **Add/Import** your secrets via the web UI or CLI
6. **Wire into your app** — secrets load automatically on startup

### Each Developer Maintains Their Own Instance

- Every developer on your team should have their own local MongoDB instance
- Every developer generates their own `ENCRYPTION_KEY`
- Your encrypted database (`secrets-manager/.env` + MongoDB) stays local — never committed

### Add to Your `.gitignore`

Since each developer has their own local instance, add the entire `secrets-manager/` folder to your parent project's `.gitignore`:

```gitignore
# Parent project's .gitignore
secrets-manager/
```

This ensures you never accidentally commit:
- The local encrypted database files
- Admin configuration (`secrets-manager/.env`)
- Any developer-specific secrets-manager instance

---

## 🚀 Production Deployment

**This project is NOT designed for production deployments.**

### Do NOT Deploy Secrets Manager

- ❌ Do NOT commit or deploy the `secrets-manager/` folder to production servers
- ❌ Do NOT rely on local MongoDB in production environments
- ❌ Do NOT use the admin UI in production

### Use Appropriate Production Solutions

In production, use one of these established secret management systems:

| Provider | Service |
|----------|---------|
| AWS | [Secrets Manager](https://aws.amazon.com/secrets-manager/) or ECS/EKS environment variables |
| Azure | [Key Vault](https://azure.microsoft.com/en-us/services/key-vault/) or App Service environment variables |
| Google Cloud | [Secret Manager](https://cloud.google.com/secret-manager) or Cloud Run environment variables |
| HashiCorp | [Vault](https://www.vaultproject.io/) |
| Other | Platform-provided environment variables (Render, Fly.io, etc.) |

### Production Servers Use Standard Environment Variables

Production applications should read secrets from their hosting platform's native environment variable system, exactly as they did before using Secrets Manager locally. Your production `NODE_ENV` will be set to `"production"` and the loader gracefully skips loading secrets, allowing your app to use system environment variables as intended.

---

## 4. Generate Your Encryption Key

The encryption key is the **one real secret** that Secrets Manager needs. It must be a 64-character hex string (32 bytes).

**Generate one:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
```

**Add it to your shell profile** (`~/.zshrc` or `~/.bashrc`):

```bash
export ENCRYPTION_KEY="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b"
```

**Restart your terminal** or reload your profile:
```bash
source ~/.zshrc   # or source ~/.bashrc
```

> ⚠️ **Never** put this key in a project file. It belongs in your shell profile only. This way, even if someone gains access to your project files, they cannot decrypt your secrets without also having access to your machine's user account.
>
> **⚠️ If you lose this key, your secrets are permanently inaccessible.** There is no recovery mechanism — without the exact 64-character hex key, the encrypted data in MongoDB cannot be decrypted. Keep a secure backup of this key outside the project.

### Set Your Project Name (Optional)

If you're using Secrets Manager across multiple projects, set `PROJECT_NAME` in your shell profile so each project gets its own MongoDB database:

```bash
export PROJECT_NAME="myapp"
```

The database name defaults to `secrets-manager` if this variable is not set. The full URI becomes:

```
mongodb://localhost:27017/{PROJECT_NAME}
```

Add this to `~/.zshrc` or `~/.bashrc` alongside `ENCRYPTION_KEY`.

---

## 5. Set Admin Credentials

The web UI is protected by HTTP Basic Auth. You can set credentials via environment variables:

```bash
export ADMIN_USER="myuser"
export ADMIN_PASSWORD="mypassword"
```

Add these to your shell profile alongside `ENCRYPTION_KEY`, or create a `.env` file **inside the `secrets-manager` folder** (it's gitignored):

```
# secrets-manager/.env
ADMIN_USER=myuser
ADMIN_PASSWORD=mypassword
```

**Default credentials** (if not set): `admin` / `admin`

> **Tradeoff:** Putting credentials in a `.env` file inside `secrets-manager/` is acceptable because this file is gitignored and only contains the admin UI password — not your actual application secrets. However, using shell environment variables is more secure.

---

## 6. Import an Existing .env File

If you already have a `.env` file with real secrets, import them all at once:

```bash
cd secrets-manager
npm run import-env -- ../.env
```

This will:
1. Read every key-value pair from your `.env` file
2. Encrypt each value with AES-256-GCM
3. Store them in MongoDB
4. Print a reminder to **delete the original `.env` file**

```bash
# After confirming the import worked:
rm ../.env
```

> ⚠️ **Important:** The original `.env` file still contains real plaintext secrets. Delete or archive it after importing.

---

## 7. Add a Single Secret via CLI

Add or update a single secret from the command line:

```bash
cd secrets-manager
npm run add-secret -- MY_API_KEY sk-abc123def456
```

With an optional description:
```bash
npm run add-secret -- DATABASE_URL "mongodb://user:pass@localhost/myapp" "Production database connection string"
```

The key is automatically uppercased and trimmed.

---

## 8. Start the Admin Web UI

```bash
cd secrets-manager
npm run ui
```

You'll see:
```
  ╔══════════════════════════════════════════╗
  ║  Secrets Manager is running              ║
  ║                                          ║
  ║  Local:  http://127.0.0.1:4321           ║
  ║                                          ║
  ║  Log in with your ADMIN_USER/            ║
  ║  ADMIN_PASSWORD credentials              ║
  ╚══════════════════════════════════════════╝
```

Open **http://127.0.0.1:4321** in your browser. Your browser will prompt for the admin username and password.

---

## 9. Using the Web UI

The admin UI has three sections:

### Add / Update Secret
- Enter a **Key** (e.g., `MY_API_KEY`) — automatically uppercased
- Enter the **Value** (the real secret)
- Optionally add a **Description** (e.g., "API key for Stripe")
- Click **Save Secret**

### Import .env File
- Drag and drop a `.env` file onto the dashed area, or click to browse
- The file is read client-side and the raw text is sent to the server
- All keys are imported and encrypted

### Stored Secrets Table
- Lists all secrets with their keys, masked values, descriptions, and last updated time
- **Reveal** button per row — click to see the real value (only you can see it)
- **Hide** button to re-mask the value
- **Delete** button per row — click to delete (with confirmation prompt)
- **Export .env** button — downloads all secrets for the current environment as `.env.development` or `.env.production`

### Key Validation
- Keys must contain only **letters (A-Z, a-z), numbers (0-9), and underscores (_)**
- No spaces or special characters allowed
- Keys are automatically trimmed and uppercased before saving
- Values are automatically trimmed before saving

### Export .env File
- Click the **Export .env** button to download all secrets for the current environment
- Exports as `.env.development` (Dev mode) or `.env.production` (Prod mode)
- Button is disabled when no secrets exist for the current environment

---

## 10. Wire Into Your Application

This is the most important step. In your application's **entry file** (the very first file that runs — `index.js`, `app.js`, `server.js`, etc.), add this at the **very top**, before any other code:

```javascript
const fs = require("fs");
const path = require("path");

async function loadLocalSecrets() {
  // Skip in production
  if (process.env.NODE_ENV === "production") {
    console.log("🚀 Production mode detected. Using system environment variables.");
    return;
  }

  const loaderPath = path.join(
    __dirname,
    "secrets-manager",
    "src",
    "loader",
    "loadSecrets.js"
  );

  // Secrets Manager not installed
  if (!fs.existsSync(loaderPath)) {
    console.log("ℹ️ Secrets Manager not found. Using process.env.");
    return;
  }

  try {
    const loadSecrets = require(loaderPath);
    await loadSecrets();
    console.log("🔐 Local secrets loaded.");
  } catch (err) {
    console.warn("⚠️ Failed to load Secrets Manager.");
    console.warn(err.message);
  }
}

(async () => {
  await loadLocalSecrets();

  app.listen(process.env.PORT || 3000, () => {
    console.log("Server running...");
  });
})();
```

**Why this pattern?** This production-safe loader:
- Skips Secrets Manager entirely in production (uses platform env vars)
- Gracefully handles missing Secrets Manager (falls back to process.env)
- Won't crash your production deployment if the tool isn't present

**Options:**
- `loadSecrets()` — loads secrets for the current `NODE_ENV` (defaults to `development`)
- `loadSecrets({ environment: 'production' })` — explicitly load production secrets
- `loadSecrets({ override: true })` — overwrites existing env vars

### Recommended npm scripts in your parent project's `package.json`

Add these scripts to your **parent project's** `package.json` (the one at the root, not inside `secrets-manager/`):

```json
{
  "scripts": {
    "start": "node test-server.js",
    "start:dev": "cross-env NODE_ENV=development node test-server.js",
    "start:prod": "cross-env NODE_ENV=production node test-server.js"
  }
}
```

> **On macOS/Linux** you can use `NODE_ENV=development` directly without `cross-env`.  
> On **Windows** or for cross-platform compatibility, install `cross-env`: `npm install --save-dev cross-env`

**How it works:**
- `npm run start:dev` — sets `NODE_ENV=development`, loads only **development** secrets
- `npm run start` — no NODE_ENV set, defaults to loading **development** secrets (same as start:dev)
- `npm run start:prod` — sets `NODE_ENV=production`, loads only **production** secrets

The loader automatically detects `process.env.NODE_ENV` and filters secrets by that environment.

---

## 11. .env.example — Safe to Commit

Every time you add, update, or delete a secret, Secrets Manager automatically generates a `.env.example` file in your **project root** (the parent folder of `secrets-manager/`, not inside `secrets-manager/`).

This file contains:
- Only the **key names** and **descriptions** — never real values
- **Fake placeholder values** based on pattern-matching (e.g., keys with "KEY" get `CHANGE_ME_xxxxxxxxxxxxxxxx`, URLs get `https://example.com`)
- Comments explaining each key

**This file is safe to commit to git.** It tells other developers what environment variables the project needs, without exposing any real secrets.

---

## 12. Troubleshooting

### "ENCRYPTION_KEY is missing" error

```
╔══════════════════════════════════════╗
║  ENCRYPTION_KEY is missing!        ║
╚══════════════════════════════════════╝
```

**Solution:** You haven't set the `ENCRYPTION_KEY` environment variable.

1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add it to `~/.zshrc` or `~/.bashrc`: `export ENCRYPTION_KEY="<your-key>"`
3. Run `source ~/.zshrc` (or restart your terminal)
4. Try again

### "Cannot connect to MongoDB" error

```
[DB] Failed to connect to MongoDB at mongodb://localhost:27017/secretsdb
[DB] Ensure MongoDB is installed and running locally.
```

**Solution:** MongoDB is not running.

1. **macOS:** `brew services start mongodb-community`
2. **Ubuntu:** `sudo systemctl start mongod`
3. **Windows:** Open Services (services.msc), find MongoDB, click Start
4. Verify: `mongosh` or `mongo` should connect

### "Port already in use" error

If you're running Secrets Manager for multiple projects at the same time, they'll all try to use port 4321.

**Solution:** Set a different port for each project:

```bash
export PORT=4322
npm run ui
```

Or add `PORT=4322` to the project's `secrets-manager/.env` file.

---

## 13. Security Notes

- **This tool is designed for local development use only.** It stores secrets in a local MongoDB instance with no authentication, bound to localhost.

- **The admin UI binds to 127.0.0.1 only** (not 0.0.0.0), so it's not accessible from other machines on your network.

- **Encryption is AES-256-GCM** with a unique random IV for each secret. The encryption key is never stored in the project — it lives in your shell profile.

- **For production**, use a proper cloud secret manager like:
  - [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
  - [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/)
  - [Google Secret Manager](https://cloud.google.com/secret-manager)
  - [HashiCorp Vault](https://www.vaultproject.io/)

- **The MongoDB URI is hardcoded** as `mongodb://localhost:27017/secretsdb` because it's a local-only, no-auth connection that is not exposed on any network. This is intentional and not treated as a secret.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `npm run ui` | Start the admin web UI |
| `npm run add-secret -- KEY value` | Add or update a single secret |
| `npm run import-env -- /path/to/.env` | Import all secrets from a .env file |
| `npm run gen-key` | Generate a new encryption key |

## API Reference

The secrets manager exposes a REST API under `/api/secrets` (protected by HTTP Basic Auth):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/secrets` | GET | List all secrets with decrypted values (paginated) |
| `/api/secrets` | POST | Create or update a single secret |
| `/api/secrets/:key` | DELETE | Delete a secret by key |
| `/api/secrets/import` | POST | Bulk import secrets from `.env` text |
| `/api/secrets/export` | GET | Export all secrets for an environment as `.env.{environment}` |
| `/api/config` | GET | Get database configuration (name, host) |

### Export API Example

```bash
# Download .env.development
curl -u admin:password http://127.0.0.1:4321/api/secrets/export?environment=development -o .env.development

# Download .env.production
curl -u admin:password http://127.0.0.1:4321/api/secrets/export?environment=production -o .env.production
```

## Project Structure

```
secrets-manager/
├── src/
│   ├── server.js              # Server entry point
│   ├── app.js                 # Express app setup
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── env.js             # Environment validation
│   │   └── logger.js          # Timestamped logger
│   ├── models/
│   │   └── Secret.model.js    # Mongoose schema
│   ├── routes/
│   │   ├── index.js           # Route index
│   │   └── secrets.routes.js  # REST endpoints
│   ├── controllers/
│   │   └── secrets.controller.js
│   ├── services/
│   │   └── secrets.service.js # Business logic
│   ├── middleware/
│   │   └── basicAuth.middleware.js
│   ├── utils/
│   │   ├── encrypt.util.js    # AES-256-GCM
│   │   └── fakeValue.util.js  # Placeholder generator
│   ├── loader/
│   │   └── loadSecrets.js     # ← Your app imports this
│   └── generators/
│       └── generateEnvExample.js
├── cli/
│   ├── addSecret.js
│   └── importEnv.js
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── .gitignore
├── package.json
└── README.md

# Generated in parent project root (not inside secrets-manager/):
# .env.example
```

---

*Built with ❤️ for developers who care about secret hygiene.*