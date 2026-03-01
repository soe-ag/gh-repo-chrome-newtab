(() => {
  const form = document.getElementById("settings-form");
  const usernameInput = document.getElementById("username");
  const tokenInput = document.getElementById("token");
  const msgEl = document.getElementById("form-msg");

  function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = `form-msg ${type}`;
  }

  function hideMsg() {
    msgEl.className = "form-msg hidden";
  }

  // Load saved values
  Promise.all([
    chrome.storage.sync.get("githubUsername"),
    chrome.storage.local.get("githubToken"),
  ]).then(([{ githubUsername }, { githubToken }]) => {
    if (githubUsername) usernameInput.value = githubUsername;
    if (githubToken) tokenInput.value = githubToken;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg();

    const username = usernameInput.value.trim();
    const token = tokenInput.value.trim();

    if (!username) {
      showMsg("GitHub username is required.", "error");
      usernameInput.focus();
      return;
    }

    try {
      await Promise.all([
        chrome.storage.sync.set({ githubUsername: username }),
        chrome.storage.local.set({ githubToken: token }),
      ]);
      showMsg("Settings saved! Reload the new tab to see your repositories.", "success");
    } catch {
      showMsg("Failed to save settings. Please try again.", "error");
    }
  });
})();
