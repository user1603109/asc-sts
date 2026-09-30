# 🏆 ASC-STS (Automated Scoring & Tabulation System)
### Next.js + Google Sheets Edition (Vercel Ready)
**Organization:** Apayao State College  
**Brand Palette:** Midnight Navy (`#0A192F`) & Amber Gold (`#FFBF00`)

---

## 📖 Overview

ASC-STS has been modernized into a **Vercel-native full-stack application (Next.js 14 + TypeScript)** that uses **Google Sheets** as its relational database. This allows you to leverage your Google Account (including your Google AI Pro 5TB Google Drive storage) for zero-cost, high-reliability serverless tabulation.

The original MySQL schema in [`database/asts.sql`](file:///d:/ASC-STS/database/asts.sql) remains 100% untouched. All 13 tables are mapped 1:1 into separate worksheet tabs in your Google Spreadsheet.

---

## 🗂️ Google Sheets Database Mapping (13 Relational Tables)

| Sheet Tab | Columns (Exact match with `database/asts.sql`) |
| :--- | :--- |
| `system_settings` | `id`, `setting_key`, `setting_value` |
| `users` | `id`, `username`, `password`, `full_name`, `role`, `approval_status` |
| `event_types` | `id`, `type_name` |
| `courses` | `id`, `course_name` |
| `departments` | `id`, `department_name`, `department_code` |
| `organizers` | `id`, `organizer_name` |
| `events` | `id`, `name`, `description`, `type`, `participation_mode`, `department`, `organizer`, `academic_year`, `start_date`, `end_date`, `status` |
| `event_judges` | `id`, `event_id`, `user_id` |
| `candidates` | `id`, `event_id`, `name`, `image_path`, `course_id`, `year_level`, `order_number`, `registry_id` |
| `event_portions` | `id`, `event_id`, `portion_name`, `percentage`, `order_number`, `status` |
| `criteria` | `id`, `event_id`, `portion_id`, `name`, `max_score`, `percentage` |
| `scores` | `id`, `event_id`, `judge_id`, `candidate_id`, `criteria_id`, `score` |
| `participants_registry` | `id`, `name`, `course_id`, `year_level`, `image_path` |

---

## ⚡ 1-Click Database Setup (Option A: Using Google Apps Script)

You do **not** have to manually create 13 sheets or type column headers!

1. Open a blank Google Spreadsheet in your Google Account.
2. Click **Extensions** > **Apps Script** in the top menu.
3. Open the file [`scripts/GoogleAppsScript_QuickSetup.gs`](file:///d:/ASC-STS/scripts/GoogleAppsScript_QuickSetup.gs), copy all the code, and paste it into the Apps Script editor.
4. Click **Run** (`initializeDatabase`).
5. In 5 seconds, all 13 tables with headers and initial seeds (departments, courses, default admin user) are automatically created and styled with ASC Midnight Navy & Amber headers!

---

## 🔑 Google Cloud Service Account Setup

To allow Vercel to securely read and write scores to your Google Spreadsheet:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select an existing one).
3. Enable **Google Sheets API** and **Google Drive API** under **APIs & Services** > **Library**.
4. Go to **APIs & Services** > **Credentials** > **Create Credentials** > **Service Account**.
5. Once created, click on the service account > **Keys** tab > **Add Key** > **Create new key** (JSON).
6. Open your Google Spreadsheet and click **Share** > paste the service account email (e.g. `your-service-account@project.iam.gserviceaccount.com`) with **Editor** role.

---

## 🚀 Deploying to Vercel

1. Push this project to your GitHub, GitLab, or Bitbucket repository.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Under **Environment Variables**, add:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `your-service-account@...` | Service account email |
| `GOOGLE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | Full private key including `\n` |
| `GOOGLE_SHEET_ID` | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` | Extracted from your Google Sheet URL |
| `JWT_SECRET` | `your-custom-secure-random-string` | Secret for judge/admin sessions |
| `GOOGLE_DRIVE_FOLDER_ID` | *(Optional)* | Google Drive folder ID for 5TB photo storage |

4. Click **Deploy**. Your ASC-STS will be live worldwide in under 2 minutes!

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the system.
* **Administrator Portal:** `/admin/login` (Default username: `admin`, password: `adminpassword123`)
* **Judge Portal:** `/login`

---

## 🔒 Security & Data Persistence Note
* When running without Google credentials, the application automatically operates in **Local In-Memory Demo Mode** so you can preview and test all pages.
* Once you set `.env.local` or Vercel Environment Variables, the system switches to **Live Google Sheets Persistence**.
