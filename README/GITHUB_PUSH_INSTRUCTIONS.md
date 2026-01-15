# 🚀 Push Everything to GitHub - Instructions

## Quick Method (Recommended)

Run the provided script:

```bash
chmod +x push-to-github.sh
./push-to-github.sh
```

## Manual Method

If the script doesn't work, follow these steps:

### Step 1: Navigate to Project Root
```bash
cd "/Users/alphamac/Downloads/UBS ERP "
```

### Step 2: Update Remote URL
```bash
git remote set-url origin https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM.git
```

Or if remote doesn't exist:
```bash
git remote add origin https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM.git
```

### Step 3: Add All Files
```bash
git add -A
```

### Step 4: Commit (if there are changes)
```bash
git commit -m "Complete UBS ERP System - Full implementation with email server, invoice management, multi-company support, and all features"
```

### Step 5: Push to GitHub
```bash
git push -u origin main
```

**Note:** You'll be prompted for GitHub credentials:
- **Username:** Your GitHub username
- **Password:** Use a Personal Access Token (not your GitHub password)
  - Create one at: https://github.com/settings/tokens
  - Select scopes: `repo` (full control of private repositories)

## If Repository Doesn't Exist on GitHub

1. Go to: https://github.com/new
2. Repository name: `UBS-ERP-SYSTEM`
3. Description: "Full-scale ERP Management System for UBS"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"
7. Then run the push commands above

## Verify Push

After pushing, check:
https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM

## Troubleshooting

### Authentication Issues
If you get authentication errors:
1. Use Personal Access Token instead of password
2. Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Large Files
If you get errors about large files:
- The `.gitignore` already excludes `node_modules`, `.env`, and build files
- If needed, use Git LFS for large files

### Remote Already Exists
If remote already exists with wrong URL:
```bash
git remote remove origin
git remote add origin https://github.com/TheophilusAidoo/UBS-ERP-SYSTEM.git
```
