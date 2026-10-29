# NMMS Exam Portal - Cloudflare Package

This folder contains the complete, self-contained Cloudflare deployment files for the **NMMS Exam Portal**.

---

## 📁 Folder Contents

- **`functions/`**: Cloudflare Pages Functions (Serverless backend API routes replacing Express.js):
  - `api/health.ts` & `api/db-status.ts`
  - `api/admin/` (login, forgot password, verify pin, reset password)
  - `api/students/` (student verification, roster, history, attempt management)
  - `api/quizzes/` (quiz delivery, anti-cheat, auto-grading, student submission, analytics)
  - `api/pyq/` (2017–2026 Previous Year Papers repository & deployment)
  - `api/subject-units/` (MAT, SAT Maths, SAT Science, SAT Social Science question bank)
  - `api/ai/` (Gemini AI question extraction from images/PDFs and question generation)
- **`d1-schema.sql`**: Complete database schema for Cloudflare D1 (SQLite)
- **`d1-seed-data.sql`**: Full seed SQL data (all PYQ papers, student roster, and question banks)
- **`wrangler.toml`**: Cloudflare Wrangler configuration
- **`generate-seed-sql.ts`**: Utility to re-generate seed data from root JSON assets

---

## 🚀 Quick Deployment Steps

Run all commands from your project root:

### 1. Login to Cloudflare
```bash
npx wrangler login
```

### 2. Create the D1 Database
```bash
npx wrangler d1 create nmms-exam-db
```
*Copy the `database_id` from the terminal output and paste it into `cloudflare/wrangler.toml` (and root `wrangler.toml`).*

### 3. Initialize D1 Schema and Seed Data
```bash
npx wrangler d1 execute nmms-exam-db --remote --file=./cloudflare/d1-schema.sql
npx wrangler d1 execute nmms-exam-db --remote --file=./cloudflare/d1-seed-data.sql
```

### 4. Configure Gemini API Key Secret
```bash
npx wrangler pages secret put GEMINI_API_KEY
```

### 5. Build and Deploy
```bash
npm run build:cf
npx wrangler pages deploy dist --project-name=nmms-exam-portal
```
