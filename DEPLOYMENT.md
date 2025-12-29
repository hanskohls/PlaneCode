# 🚀 PlaneCode Deployment Guide

This guide provides step-by-step instructions to deploy PlaneCode to Fly.io using GitHub Actions. Optimized for use on your phone with the Fly.io app! ✈️📱

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Fly.io Setup](#initial-flyio-setup)
3. [GitHub Repository Setup](#github-repository-setup)
4. [Deploying Your App](#deploying-your-app)
5. [Managing Your App via Fly.io Mobile App](#managing-your-app-via-flyio-mobile-app)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ A Fly.io account (free tier available)
- ✅ The Fly.io mobile app installed on your phone
- ✅ Access to your GitHub repository
- ✅ GitHub mobile app (optional, but helpful)

---

## Initial Fly.io Setup

### Step 1: Create a Fly.io Account (If You Haven't Already)

1. **Via Mobile Browser or Fly.io App:**
   - Go to https://fly.io/app/sign-up
   - Sign up with your email or GitHub account
   - Verify your email address

### Step 2: Get Your Fly.io API Token

**Option A: Using Fly.io Mobile App (Easiest on Phone)**

1. Open the **Fly.io mobile app**
2. Tap on your **profile/account** section
3. Navigate to **Settings** or **Access Tokens**
4. Tap **Create Token** or **New Token**
5. Give it a name like `github-actions-deploy`
6. **Copy the token** (save it securely - you'll need it for GitHub)

**Option B: Using Mobile Browser**

1. Go to https://fly.io/user/personal_access_tokens
2. Click **Create Token**
3. Name it `github-actions-deploy`
4. Copy the token and save it securely

---

## GitHub Repository Setup

### Step 3: Add Fly.io Token to GitHub Secrets

**Via GitHub Mobile App:**

1. Open **GitHub mobile app**
2. Go to your **PlaneCode repository**
3. Tap the **⋮** (three dots) menu
4. Select **Settings**
5. Scroll to **Secrets and variables** → **Actions**
6. Tap **New repository secret**
7. Name: `FLY_API_TOKEN`
8. Value: Paste your Fly.io token from Step 2
9. Tap **Add secret**

**Via Mobile Browser:**

1. Go to `https://github.com/YOUR_USERNAME/PlaneCode/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `FLY_API_TOKEN`
4. Value: Paste your Fly.io token
5. Click **Add secret**

### Step 4: Initialize Your Fly.io App

**Important:** This step needs to be done once before the first deployment.

**Option A: Using Fly.io CLI (Desktop/Laptop - Before Your Flight)**

If you have access to a computer:

```bash
# Install flyctl (if not already installed)
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Navigate to your project directory
cd /path/to/PlaneCode

# Launch your app (this creates it on Fly.io)
fly launch --name planecode --region iad --no-deploy

# The above command will:
# - Create the app on Fly.io
# - Generate/update fly.toml configuration
# - NOT deploy yet (we'll use GitHub Actions for that)
```

**Option B: Using Fly.io Web Dashboard (Mobile Browser)**

1. Go to https://fly.io/dashboard
2. Click **New App**
3. Name it: `planecode` (or your preferred name)
4. Choose a region close to you (e.g., `iad` for US East)
5. Select the free tier
6. Don't configure anything else - our GitHub Action will handle deployment

**Important Note:** Update the `app` name in `fly.toml` if you used a different name:
- Edit `fly.toml` in your repository
- Change `app = "planecode"` to `app = "your-app-name"`

---

## Deploying Your App

### Step 5: Trigger Deployment

The app will automatically deploy when:

1. **You push to the `main` branch**, or
2. **You merge a Pull Request into `main`**

**To Deploy Now:**

**Option A: Via GitHub Mobile App**

1. Make any small change (e.g., update README.md)
2. Commit directly to `main` branch
3. GitHub Actions will automatically deploy!

**Option B: Via Pull Request**

1. Create a new branch
2. Make your changes
3. Create a Pull Request to `main`
4. Merge the Pull Request
5. GitHub Actions will automatically deploy!

### Step 6: Monitor Deployment

**Via GitHub Mobile App:**

1. Go to your repository
2. Tap **Actions** tab
3. You'll see "Deploy to Fly.io" workflow running
4. Tap on it to see deployment progress
5. Wait for the green checkmark ✅

**Via Fly.io Mobile App:**

1. Open the Fly.io app
2. Find your `planecode` app
3. Check the deployment status
4. View logs to see deployment progress

---

## Managing Your App via Fly.io Mobile App

### View Your Live App

1. Open **Fly.io mobile app**
2. Select your **planecode** app
3. Tap **Open** or the URL (e.g., `planecode.fly.dev`)
4. Your app will open in your mobile browser! 🎉

### Monitor App Health

1. In the Fly.io app, select your app
2. View **Metrics**: CPU, Memory, Request rates
3. Check **Status**: See if machines are running
4. View **Logs**: Real-time application logs

### Scale Your App (If Needed)

1. In the Fly.io app, tap your app
2. Go to **Scale**
3. Adjust **machine count** or **size**
4. Tap **Save**

### Restart Your App

1. In the Fly.io app, select your app
2. Tap **Restart** button
3. Confirm the restart

---

## Troubleshooting

### Deployment Failed?

**Check GitHub Actions Logs:**
1. GitHub mobile app → Repository → Actions
2. Click on the failed workflow
3. View error messages

**Common Issues:**

1. **Missing FLY_API_TOKEN**
   - Verify the secret is added in GitHub repository settings
   - Name must be exactly `FLY_API_TOKEN`

2. **App doesn't exist on Fly.io**
   - Create the app via Fly.io dashboard or CLI first (Step 4)
   - Make sure `app` name in `fly.toml` matches your Fly.io app name

3. **Build Failed**
   - Check that `npm run build` works locally
   - Review build logs in GitHub Actions

### App Not Loading?

1. **Check App Status** in Fly.io mobile app
   - Ensure machines are running
   - Check if app is sleeping (free tier auto-stops)

2. **View Logs** in Fly.io app
   - Look for errors in application logs
   - Check for startup issues

3. **Force Restart** via Fly.io app
   - Sometimes a restart fixes things

### Need Help?

- **Fly.io Docs:** https://fly.io/docs
- **Fly.io Community:** https://community.fly.io
- **GitHub Actions Docs:** https://docs.github.com/en/actions

---

## 🎯 Quick Reference

### Important URLs

- **Your App:** `https://planecode.fly.dev` (or your app name)
- **Fly.io Dashboard:** https://fly.io/dashboard
- **GitHub Actions:** `https://github.com/YOUR_USERNAME/PlaneCode/actions`

### Key Files in This Repository

- **`fly.toml`** - Fly.io configuration
- **`Dockerfile`** - Container build instructions
- **`.github/workflows/deploy.yml`** - GitHub Actions workflow
- **`nginx.conf`** - Nginx web server configuration

### Quick Commands (If Using CLI)

```bash
# View app status
fly status

# View logs
fly logs

# Open app in browser
fly open

# SSH into app
fly ssh console

# Deploy manually
fly deploy
```

---

## 🎉 Success!

You now have a fully automated CI/CD pipeline! Every time you merge a PR to `main`, your app will automatically deploy to Fly.io. Monitor everything from your phone using the Fly.io mobile app!

**Enjoy coding on the plane! ✈️👨‍💻**
