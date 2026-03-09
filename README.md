# gh-repo-chrome-newtab

A Chrome extension that replaces your new tab page with a dashboard of your GitHub repositories — no more hunting through GitHub manually.

![New Tab Preview](https://github.com/user-attachments/assets/aad11d86-f5c1-44a6-bfea-59b96c45accd)

## Features

- **5 cards per row** responsive grid (scales down on smaller screens)
- **10 repos shown** on load; click **See More** to reveal more
- Each card navigates to the repository in the current tab
- Shows repo name, description, visibility badge, language, ⭐ stars and forks
- **Search** repos by name or description in real time
- **Sort** repos by default (last updated), last pushed, or name
- **Pin** any repo to the top of the grid with one click
- **Bookmark bar** — add up to 10 custom links with favicon icons; drag and drop to reorder or click × to remove
- Supports **private repos** via a Personal Access Token
- Skeleton loading animation and friendly error messages

---

## How to install the extension in Chrome

> **Note:** This is a developer extension and must be loaded manually (it is not on the Chrome Web Store).

### Step 1 — Download the extension

**Option A — Clone with Git:**
```bash
git clone https://github.com/soe-ag/gh-repo-chrome-newtab.git
```

**Option B — Download as ZIP:**
1. Go to the [repository page](https://github.com/soe-ag/gh-repo-chrome-newtab)
2. Click the green **Code** button → **Download ZIP**
3. Extract the ZIP to a folder on your computer

### Step 2 — Open Chrome Extensions

1. Open Chrome and go to: `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner

   ![Developer mode toggle](https://developer.chrome.com/static/docs/extensions/get-started/tutorial/hello-world/image/extensions-page-e0d64d89a6acf_1920.png)

### Step 3 — Load the extension

1. Click **Load unpacked**
2. Select the folder where you cloned/extracted the extension (the folder that contains `manifest.json`)
3. The extension will appear in the list with the name **GitHub Repo New Tab**

### Step 4 — Configure your GitHub account

1. Open a new tab — you will see a welcome message
2. Click **Settings** (top-right corner of the new tab page)
3. Enter your **GitHub username**
4. *(Optional but recommended)* Paste a **Personal Access Token** to:
   - See your private repositories
   - Avoid API rate limits (60 req/hour without a token vs 5,000/hour with one)
5. Click **Save Settings**
6. Open a new tab — your repositories will load 🎉

---

## Generating a Personal Access Token

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo&description=gh-repo-chrome-newtab)
2. Give the token a name (e.g. `gh-repo-chrome-newtab`)
3. Select the **`repo`** scope
4. Click **Generate token**
5. Copy the token and paste it into the extension's Settings page

> **Security note:** The token is stored using `chrome.storage.local` — it stays on your device and is never synced to your Google account or transmitted anywhere other than the GitHub API.

---

## Updating the extension

If you cloned the repo, pull the latest changes:
```bash
git pull
```
Then go to `chrome://extensions` and click the **↺ refresh** icon on the extension card.

## Removing the extension

Go to `chrome://extensions`, find **GitHub Repo New Tab**, and click **Remove**.
