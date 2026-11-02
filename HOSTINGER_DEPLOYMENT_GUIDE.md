# 🚀 ASC-STS Hostinger Deployment & MySQL Setup Guide

This guide provides step-by-step instructions to deploy the **Apayao State College Automated Scoring & Tabulation System (ASC-STS)** with native **MySQL** on Hostinger (hPanel / cPanel / VPS).

---

## 📋 Prerequisites
1. Hostinger Account with Web Hosting (Business/Cloud plan with Node.js support) or VPS.
2. MySQL / phpMyAdmin access in your Hostinger control panel.

---

## 🗄️ Step 1: Create the MySQL Database in Hostinger

1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** → **MySQL Databases**.
3. Create a new database:
   - **Database Name**: e.g. `u123456789_asts_db` (or `asts_db`)
   - **Username**: e.g. `u123456789_admin`
   - **Password**: Create a strong password and save it securely.
4. Click **Create**.
5. Click **Enter phpMyAdmin** next to your new database.
6. In phpMyAdmin, click the **Import** tab at the top.
7. Click **Choose File** and select `database/asts.sql` (or `database/asts_schema.sql`).
8. Click **Go / Import** at the bottom.
   > **Note**: This will automatically create all 13 relational tables and seed the default administrator account (`admin` / `adminpassword123`) and official institutional categories.

---

## 📦 Step 2: Upload Project Files to Hostinger

### Option A: Using Hostinger File Manager
1. In hPanel, open **Files** → **File Manager**.
2. Go to your domain's root folder (e.g., `public_html` or your Node.js application directory).
3. Upload `ASC-STS-Hostinger.zip`.
4. Right-click the uploaded zip file and select **Extract**.
5. Once extracted, you can delete the zip file.

### Option B: Using Git / SSH / VPS
```bash
git clone <your-repository-url>
cd ASC-STS
npm install
```

---

## ⚙️ Step 3: Configure Environment Variables

1. In the root directory of the application, create or edit the `.env` file (you can copy `.env.example`):
```env
# Hostinger MySQL Connection
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=u123456789_asts_db
MYSQL_USER=u123456789_admin
MYSQL_PASSWORD=your_mysql_password_here

# Security Key for Session Tokens
JWT_SECRET=asc_asts_super_secret_key_2026_hostinger_secure
```

> **Tip**: On Hostinger shared/cloud hosting, `MYSQL_HOST` is usually `localhost` or `127.0.0.1`.

---

## 🛠️ Step 4: Setup and Start the Application

### In Hostinger Node.js Web Application Manager:
1. In hPanel, navigate to **Advanced** → **Node.js** (or search "Node.js").
2. Set:
   - **Node.js Version**: `18.x` or `20.x` (Recommended: `20.x LTS`)
   - **Application Root**: e.g. `public_html` (or your app folder)
   - **Application Startup File**: `server.js` or `node_modules/next/dist/bin/next` with argument `start`
3. Click **NPM Install** or open the Web Terminal:
   ```bash
   npm install
   npm run build
   npm run start
   ```

---

## 🔑 Default Administrator Login
- **URL**: `https://your-domain.com/admin/login`
- **Username**: `admin`
- **Password**: `adminpassword123`

*(You can change your password anytime under Admin → Settings → Administrator Security Profile).*

---

## ⚡ Database Maintenance Commands
- **Re-initialize / Verify Database**:
  ```bash
  npm run setup:db
  ```
- **Wipe Competition Data (Clean Slate for New Season)**:
  ```bash
  npm run wipe:db
  ```

