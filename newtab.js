(() => {
  const INITIAL_VISIBLE = 10;
  const PER_PAGE = 100; // GitHub API max per page

  const grid = document.getElementById("repo-grid");
  const statusEl = document.getElementById("status");
  const seeMoreWrap = document.getElementById("see-more-wrap");
  const seeMoreBtn = document.getElementById("see-more-btn");

  let allRepos = [];
  let visibleCount = INITIAL_VISIBLE;

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

  function buildCard(repo) {
    const card = document.createElement("a");
    card.className = "card";
    card.href = repo.html_url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.title = repo.full_name;

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

  function renderRepos() {
    grid.innerHTML = "";
    const slice = allRepos.slice(0, visibleCount);
    slice.forEach(repo => grid.appendChild(buildCard(repo)));

    if (allRepos.length > visibleCount) {
      seeMoreWrap.classList.remove("hidden");
    } else {
      seeMoreWrap.classList.add("hidden");
    }
  }

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
    const [{ githubUsername }, { githubToken }] = await Promise.all([
      chrome.storage.sync.get("githubUsername"),
      chrome.storage.local.get("githubToken"),
    ]);

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

  init();
})();
