# Cloudflare Deployment Guide for NMMS Exam Portal

This portal is fully migrated to **Cloudflare Pages with Cloudflare Pages Functions** and **Cloudflare D1 (SQLite database)**.

---

## 🚀 Step 1: Install Wrangler CLI & Authenticate

If you haven't logged in to Cloudflare from your terminal yet:

```bash
npx wrangler login
```

Verify your account connection:
```bash
npx wrangler whoami
```

---

## 🗄️ Step 2: Create Cloudflare D1 Database

Run the following command to create your production D1 SQLite database:

```bash
npx wrangler d1 create nmms-exam-db
```

Output will look like:
```text
[[d1_databases]]
binding = "DB"
database_name = "nmms-exam-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

👉 **Copy the generated `database_id` and paste it inside [wrangler.toml](file:///d:/testing/nmms-exam-portal/wrangler.toml):**
```toml
[[d1_databases]]
binding = "DB"
database_name = "nmms-exam-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

---

## 📥 Step 3: Initialize Database Schema & Seed Data

1. Run the database schema migration:
```bash
npx wrangler d1 execute nmms-exam-db --remote --file=./d1-schema.sql
```

2. Seed all PYQ papers (2017-2026), full unit question bank, and initial student roster:
```bash
npx wrangler d1 execute nmms-exam-db --remote --file=./d1-seed-data.sql
```

*(Optional: For testing locally with Wrangler dev:)*
```bash
npx wrangler d1 execute nmms-exam-db --local --file=./d1-schema.sql
npx wrangler d1 execute nmms-exam-db --local --file=./d1-seed-data.sql
```

---

## 🔑 Step 4: Configure Cloudflare Secrets & Environment Variables

Add your Gemini API key as a Cloudflare secret:

```bash
npx wrangler pages secret put GEMINI_API_KEY
```
*(Enter your Google Gemini API key when prompted)*

Optional: customize admin password or PIN if desired:
```bash
npx wrangler pages secret put ADMIN_PASSWORD
npx wrangler pages secret put ADMIN_SECURITY_PIN
```

---

## 🏗️ Step 5: Build & Deploy to Cloudflare Pages

1. Build the Vite frontend application:
```bash
npm run build:cf
```

2. Deploy the static assets and Pages Functions:
```bash
npx wrangler pages deploy dist --project-name=nmms-exam-portal
```

---

## 🧪 Local Development / Preview with Cloudflare D1

You can run the full Cloudflare Pages environment locally with D1 and Functions:

```bash
npx wrangler pages dev dist --d1=DB=nmms-exam-db
```
Open your browser at `http://localhost:8788`.

