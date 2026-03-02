(() => {
  const INITIAL_VISIBLE = 10;
  const PER_PAGE = 100; // GitHub API max per page
  const MAX_BOOKMARKS = 10;

  const grid = document.getElementById("repo-grid");
  const statusEl = document.getElementById("status");
  const seeMoreWrap = document.getElementById("see-more-wrap");
  const seeMoreBtn = document.getElementById("see-more-btn");
  const searchInput = document.getElementById("search-input");

  // Bookmark elements
  const bookmarkList = document.getElementById("bookmark-list");
  const bookmarkAddBtn = document.getElementById("bookmark-add-btn");
  const bookmarkModal = document.getElementById("bookmark-modal");
  const bmUrl = document.getElementById("bm-url");
  const bmTitle = document.getElementById("bm-title");
  const bmError = document.getElementById("bm-error");
  const bmCancel = document.getElementById("bm-cancel");
  const bmSave = document.getElementById("bm-save");

  let allRepos = [];
  let visibleCount = INITIAL_VISIBLE;
  let searchQuery = "";
  let bookmarks = []; // [{url, title}]
  let pinnedRepos = new Set(); // Set of repo.id (number)

  // Language colour map (subset of github-linguist colours)
  const LANG_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Java: "#b07219",
    "C#": "#178600",
    "C++": "#f34b7d",
    C: "#555555",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Shell: "#89e051",
    Vue: "#41b883",
    Dart: "#00B4AB",
  };

  /* ── Helpers ─────────────────────────────────────────── */

  // statusParts is an array of strings (text) and {text, href} objects (links).
  function showStatus(statusParts, type = "info") {
    statusEl.textContent = "";
    statusParts.forEach(part => {
      if (typeof part === "string") {
        statusEl.appendChild(document.createTextNode(part));
      } else {
        const a = document.createElement("a");
        a.href = part.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = part.text;
        statusEl.appendChild(a);
      }
    });
    statusEl.className = `status ${type}`;
  }

  function hideStatus() {
    statusEl.className = "status hidden";
  }

  function skeletonHTML() {
    return `
      <div class="skeleton">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>`;
  }

  function showSkeletons(n) {
    grid.innerHTML = Array.from({ length: n }, skeletonHTML).join("");
  }

  function starIcon() {
    return `<svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0
        01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8
        12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818
        6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
    </svg>`;
  }

  function forkIcon() {
    return `<svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25
        2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251
        0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0
        10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75
        7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 11-1.5 0
        .75.75 0 011.5 0z"/>
    </svg>`;
  }

  function pinIcon() {
    // Thumbtack / pin SVG
    return `<svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.456.734a1.75 1.75 0 012.826.504l.613 1.327a3.081 3.081 0 002.084 1.707l2.454.584c.515.123.882.566.882 1.092v.153a1.25 1.25 0 01-.282.795L9.936 8.089l-.415 3.848a1.75 1.75 0 01-1.668 1.558H7.75a1.75 1.75 0 01-1.662-1.2l-.958-3.032L1.98 11.107a.75.75 0 01-.96-1.152l3.49-2.905-.617-3.21a1.75 1.75 0 01.563-1.106z"/>
    </svg>`;
  }

  function buildCard(repo) {
    const isPinned = pinnedRepos.has(repo.id);
    const card = document.createElement("a");
    card.className = "card" + (isPinned ? " is-pinned" : "");
    card.href = repo.html_url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.title = repo.full_name;

    // Pin button
    const pinBtn = document.createElement("button");
    pinBtn.className = "card-pin-btn" + (isPinned ? " pinned" : "");
    pinBtn.title = isPinned ? "Unpin" : "Pin to top";
    pinBtn.innerHTML = pinIcon();
    pinBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      togglePin(repo.id);
    });
    card.appendChild(pinBtn);

    const badge = document.createElement("span");
    badge.className = "card-badge";
    if (repo.private) badge.classList.add("private");
    badge.textContent = repo.private ? "Private" : "Public";
    card.appendChild(badge);

    const nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = repo.name;
    card.appendChild(nameEl);

    const descEl = document.createElement("span");
    descEl.className = "card-desc";
    descEl.textContent = repo.description || "";
    card.appendChild(descEl);

    const meta = document.createElement("div");
    meta.className = "card-meta";

    if (repo.language) {
      const langColor = LANG_COLORS[repo.language] || "#8b949e";
      const langItem = document.createElement("span");
      langItem.className = "card-meta-item";
      const dot = document.createElement("span");
      dot.className = "card-lang-dot";
      dot.style.background = langColor;
      langItem.appendChild(dot);
      langItem.appendChild(document.createTextNode(repo.language));
      meta.appendChild(langItem);
    }

    const starItem = document.createElement("span");
    starItem.className = "card-meta-item";
    starItem.innerHTML = starIcon();
    starItem.appendChild(document.createTextNode(` ${repo.stargazers_count}`));
    meta.appendChild(starItem);

    const forkItem = document.createElement("span");
    forkItem.className = "card-meta-item";
    forkItem.innerHTML = forkIcon();
    forkItem.appendChild(document.createTextNode(` ${repo.forks_count}`));
    meta.appendChild(forkItem);

    card.appendChild(meta);
    return card;
  }

  function getFilteredAndSorted() {
    let result = allRepos;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }
    // Pinned repos appear first
    return result.slice().sort((a, b) => {
      const aPin = pinnedRepos.has(a.id) ? 0 : 1;
      const bPin = pinnedRepos.has(b.id) ? 0 : 1;
      return aPin - bPin;
    });
  }

  function renderRepos() {
    grid.innerHTML = "";
    const sorted = getFilteredAndSorted();
    const slice = sorted.slice(0, visibleCount);
    slice.forEach(repo => grid.appendChild(buildCard(repo)));

    if (sorted.length > visibleCount) {
      seeMoreWrap.classList.remove("hidden");
    } else {
      seeMoreWrap.classList.add("hidden");
    }
  }

  /* ── Pin ─────────────────────────────────────────────── */

  async function togglePin(repoId) {
    if (pinnedRepos.has(repoId)) {
      pinnedRepos.delete(repoId);
    } else {
      pinnedRepos.add(repoId);
    }
    await chrome.storage.sync.set({ pinnedRepos: [...pinnedRepos] });
    renderRepos();
  }

  /* ── Bookmarks ───────────────────────────────────────── */

  function faviconUrl(url) {
    try {
      const { origin } = new URL(url);
      return `${origin}/favicon.ico`;
    } catch {
      return null;
    }
  }

  function bookmarkInitial(title) {
    return (title || "?").charAt(0).toUpperCase();
  }

  function renderBookmarks() {
    bookmarkList.innerHTML = "";
    bookmarks.forEach(bm => {
      const card = document.createElement("a");
      card.className = "bookmark-card";
      card.href = bm.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
      card.title = bm.title || bm.url;

      const favUrl = faviconUrl(bm.url);
      if (favUrl) {
        const img = document.createElement("img");
        img.className = "bookmark-favicon";
        img.src = favUrl;
        img.alt = "";
        img.width = 20;
        img.height = 20;
        img.addEventListener("error", () => {
          const placeholder = document.createElement("span");
          placeholder.className = "bookmark-favicon-placeholder";
          placeholder.textContent = bookmarkInitial(bm.title);
          img.replaceWith(placeholder);
        }, { once: true });
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "bookmark-favicon-placeholder";
        placeholder.textContent = bookmarkInitial(bm.title);
        card.appendChild(placeholder);
      }

      const nameEl = document.createElement("span");
      nameEl.className = "bookmark-name";
      nameEl.textContent = bm.title || bm.url;
      card.appendChild(nameEl);

      const removeBtn = document.createElement("button");
      removeBtn.className = "bookmark-remove-btn";
      removeBtn.title = "Remove bookmark";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", async e => {
        e.preventDefault();
        e.stopPropagation();
        bookmarks = bookmarks.filter(b => b !== bm);
        await chrome.storage.sync.set({ bookmarks });
        renderBookmarks();
      });
      card.appendChild(removeBtn);

      bookmarkList.appendChild(card);
    });
  }

  function showBookmarkModal() {
    bmUrl.value = "";
    bmTitle.value = "";
    bmError.textContent = "";
    bmError.classList.add("hidden");
    bookmarkModal.classList.remove("hidden");
    bmUrl.focus();
  }

  function hideBookmarkModal() {
    bookmarkModal.classList.add("hidden");
  }

  async function saveBookmark() {
    const url = bmUrl.value.trim();
    const title = bmTitle.value.trim();

    if (!url) {
      bmError.textContent = "Please enter a URL.";
      bmError.classList.remove("hidden");
      return;
    }
    try {
      new URL(url);
    } catch {
      bmError.textContent = "Please enter a valid URL (e.g. https://example.com).";
      bmError.classList.remove("hidden");
      return;
    }
    if (bookmarks.length >= MAX_BOOKMARKS) {
      bmError.textContent = `Maximum of ${MAX_BOOKMARKS} bookmarks reached.`;
      bmError.classList.remove("hidden");
      return;
    }

    bookmarks.push({ url, title: title || url });
    await chrome.storage.sync.set({ bookmarks });
    renderBookmarks();
    hideBookmarkModal();
  }

  bookmarkAddBtn.addEventListener("click", showBookmarkModal);
  bmCancel.addEventListener("click", hideBookmarkModal);
  bmSave.addEventListener("click", saveBookmark);
  bookmarkModal.addEventListener("click", e => {
    if (e.target === bookmarkModal) hideBookmarkModal();
  });
  function handleModalInputKey(e) { if (e.key === "Enter") saveBookmark(); }
  bmUrl.addEventListener("keydown", handleModalInputKey);
  bmTitle.addEventListener("keydown", handleModalInputKey);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !bookmarkModal.classList.contains("hidden")) hideBookmarkModal();
  });

  /* ── GitHub API fetch ─────────────────────────────────── */

  async function fetchAllRepos(token, username) {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let repos = [];
    let page = 1;

    // Fetch up to 3 pages (300 repos) to keep it snappy
    while (page <= 3) {
      const endpoint = token
        ? `https://api.github.com/user/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&affiliation=owner`
        : `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${PER_PAGE}&page=${page}&sort=updated`;

      const res = await fetch(endpoint, { headers });

      if (!res.ok) {
        const settingsLink = { text: "Settings", href: "options.html" };
        if (res.status === 401) {
          const err = new Error("auth");
          err.parts = ["Invalid or expired token. Please update it in ", settingsLink, "."];
          throw err;
        }
        if (res.status === 403) {
          let apiMessage = "";
          try {
            const body = await res.clone().json();
            if (body && typeof body.message === "string") apiMessage = body.message.toLowerCase();
          } catch { /* ignore parse errors */ }

          const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
          const isRateLimit = rateLimitRemaining === "0" || apiMessage.includes("rate limit");

          const err = new Error("forbidden");
          if (isRateLimit) {
            err.parts = ["API rate limit exceeded. Add a token in ", settingsLink, " for higher limits."];
          } else if (apiMessage.includes("sso") || apiMessage.includes("single sign-on")) {
            err.parts = ["Access is restricted by GitHub SSO. Authorize your token for this organization, then update it in ", settingsLink, "."];
          } else if (apiMessage.includes("permission") || apiMessage.includes("insufficient") || apiMessage.includes("access")) {
            err.parts = ["Your token does not have sufficient permissions. Check token scopes and update it in ", settingsLink, "."];
          } else {
            err.parts = ["GitHub returned 403 Forbidden. Check your token and permissions in ", settingsLink, "."];
          }
          throw err;
        }
        if (res.status === 404) {
          const err = new Error("notfound");
          err.parts = [`User "${username}" not found. Check the username in `, settingsLink, "."];
          throw err;
        }
        throw new Error(`GitHub API error ${res.status}. Try again later.`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      repos = repos.concat(data);
      if (data.length < PER_PAGE) break;
      page++;
    }

    return repos;
  }

  /* ── Main ─────────────────────────────────────────────── */

  async function init() {
    const [{ githubUsername }, { githubToken }, syncData] = await Promise.all([
      chrome.storage.sync.get("githubUsername"),
      chrome.storage.local.get("githubToken"),
      chrome.storage.sync.get(["bookmarks", "pinnedRepos"]),
    ]);

    bookmarks = syncData.bookmarks || [];
    pinnedRepos = new Set(syncData.pinnedRepos || []);
    renderBookmarks();

    if (!githubUsername && !githubToken) {
      showStatus(
        ["Welcome! Please set your GitHub username (and optionally a Personal Access Token) in ",
          { text: "Settings", href: "options.html" },
          " to see your repositories."],
        "info"
      );
      return;
    }

    showSkeletons(INITIAL_VISIBLE);

    try {
      allRepos = await fetchAllRepos(githubToken || "", githubUsername || "");

      hideStatus();

      if (allRepos.length === 0) {
        showStatus(["No repositories found for this account."], "info");
        return;
      }

      renderRepos();
    } catch (err) {
      grid.innerHTML = "";
      showStatus(err.parts || [err.message || "Failed to load repositories."], "error");
    }
  }

  seeMoreBtn.addEventListener("click", () => {
    visibleCount += INITIAL_VISIBLE;
    renderRepos();
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim();
    visibleCount = INITIAL_VISIBLE;
    renderRepos();
  });

  init();
})();
