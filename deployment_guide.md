# V.O.T.E. Platform Deployment Guide

This guide details the step-by-step process for compiling and deploying the **V.O.T.E.** frontend application.

---

## 🏗️ 1. Compiling the Production Build

Before uploading files to any hosting provider, you must compile the React & TypeScript codebase into highly optimized static web assets:

1. Open your terminal in the project directory.
2. Run the production build command:
   ```bash
   npm run build
   ```
3. Vite will compile the bundle and output all final assets into the `dist/` directory at the project root:
   - `dist/index.html` (entry page)
   - `dist/assets/` (compiled and compressed CSS stylesheets, JavaScript files, and SVGs)

---

## 🚀 2. Deploying to Spaceship.com Hosting

Spaceship.com provides hosting managed via cPanel and SSH. To deploy the static build:

### Option A: Manual Upload via Spaceship File Manager
1. Log in to your **Spaceship Launchpad**.
2. Select your hosting plan and open the **File Manager** (or cPanel).
3. Navigate to your website's root directory (typically `public_html/`).
4. Upload the **contents** of your local `dist/` folder directly into `public_html/` (do not upload the `dist` folder itself, upload the files inside it so `index.html` resides directly in `public_html/`).

### Option B: Deploying via SFTP (Secure File Transfer)
Use an SFTP client (like FileZilla, Cyberduck, or VS Code SFTP extensions) to sync your builds:
- **Host**: `ftp.yourdomain.com` (or the IP address provided in your Spaceship welcome email)
- **Port**: `22` (for SFTP / SSH)
- **Username & Password**: Your Spaceship cPanel account credentials.
- **Remote Path**: `/public_html/`
- **Source**: Drag and drop the contents of your local `dist/` directory.

---

## ⚡ 3. Deploying via Git (Recommended & Automatic)

Since we have already successfully initialized and pushed your project to your GitHub repository ([V.O.T.E. on GitHub](https://github.com/swarnavobiswas2005-debug/V.O.T.E.git)), you can set up continuous deployment:

### Option A: Vercel (1-Click Deployment)
1. Go to [Vercel.com](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New** > **Project**.
3. Import your repository: `swarnavobiswas2005-debug/V.O.T.E`.
4. Vercel will automatically detect that it is a **Vite** application.
5. Click **Deploy**. Any future commits you push to GitHub will automatically trigger a new deployment.

### Option B: Netlify
1. Go to [Netlify.com](https://www.netlify.com/) and sign in with GitHub.
2. Click **Import from Git** and authorize your GitHub account.
3. Select `V.O.T.E.` from your repository list.
4. Set the build command to `npm run build` and the publish directory to `dist`.
5. Click **Deploy Site**.

### Option C: GitHub Pages
To host it directly on GitHub for free:
1. Go to your repository settings on GitHub.
2. Navigate to **Pages** in the sidebar.
3. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. Create a workflow file in your project under `.github/workflows/deploy.yml` with the static pages builder template. This will deploy the site automatically every time you push to the `main` branch.
