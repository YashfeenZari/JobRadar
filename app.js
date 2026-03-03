(() => {
  const JOBS = createJobsDataset();
  const STORAGE_KEY = "jobradar_saved_jobs_v1";
  const PREFS_KEY = "jobTrackerPreferences";

  let currentPreferences = loadPreferencesFromStorage();

  const routes = {
    "/": {
      path: "/",
      title: "Stop Missing The Right Jobs.",
      subtitle: "Precision-matched job discovery delivered daily at 9AM.",
      ctaLabel: "Start Tracking",
      ctaTo: "/settings",
      section: "landing",
    },
    "/dashboard": {
      path: "/dashboard",
      title: "Dashboard",
      subtitle: "No jobs yet. In the next step, you will load a realistic dataset.",
      section: "dashboard",
    },
    "/saved": {
      path: "/saved",
      title: "Saved",
      subtitle: "Jobs you save for later will appear here in the next step.",
      section: "saved",
    },
    "/digest": {
      path: "/digest",
      title: "Digest",
      subtitle: "A calm daily summary of your most relevant roles will be introduced here in the next step.",
      section: "digest",
    },
    "/settings": {
      path: "/settings",
      title: "Settings",
      subtitle: "Define your preferences so JobRadar knows what to track.",
      section: "settings",
    },
    "/proof": {
      path: "/proof",
      title: "Proof",
      subtitle: "This page will later collect artifacts that show the system working end to end.",
      section: "proof",
    },
  };

  const notFoundRoute = {
    path: null,
    title: "Page Not Found",
    subtitle: "The page you are looking for does not exist.",
    isNotFound: true,
  };

  function getInitialPath() {
    const { pathname } = window.location;
    // When opened directly via file://, always show the landing page.
    if (window.location.protocol === "file:") {
      return "/";
    }
    // For real HTTP routes, let unknown paths fall through to 404.
    return routes[pathname] ? pathname : pathname;
  }

  function findRoute(path) {
    if (routes[path]) {
      return routes[path];
    }
    return notFoundRoute;
  }

  function renderRoute(route) {
    const pageTitleEl = document.getElementById("jr-page-title");
    const pageSubtitleEl = document.getElementById("jr-page-subtitle");
    const routeHeadingEl = document.getElementById("jr-route-heading");
    const routeSubtextEl = document.getElementById("jr-route-subtext");
    const navLinks = document.querySelectorAll(".jr-nav__link");
    const ctaButton = document.getElementById("jr-route-cta");
    const settingsSection = document.getElementById("jr-settings-section");
    const dashboardSection = document.getElementById("jr-dashboard-section");
    const savedSection = document.getElementById("jr-saved-section");
    const digestSection = document.getElementById("jr-digest-section");
    const proofSection = document.getElementById("jr-proof-section");
    const banner = document.getElementById("jr-dashboard-banner");

    if (
      !pageTitleEl ||
      !pageSubtitleEl ||
      !routeHeadingEl ||
      !routeSubtextEl
    ) {
      return;
    }

    pageTitleEl.textContent = route.title;
    pageSubtitleEl.textContent = route.subtitle;
    routeHeadingEl.textContent = route.title;
    routeSubtextEl.textContent = route.subtitle;

    if (ctaButton) {
      if (route.ctaLabel && route.ctaTo && route.section === "landing") {
        ctaButton.textContent = route.ctaLabel;
        ctaButton.dataset.targetRoute = route.ctaTo;
        ctaButton.hidden = false;
        ctaButton.style.display = "";
      } else {
        ctaButton.hidden = true;
        ctaButton.style.display = "none";
        delete ctaButton.dataset.targetRoute;
      }
    }

    if (settingsSection) {
      settingsSection.hidden = route.section !== "settings";
    }
    if (dashboardSection) {
      dashboardSection.hidden = route.section !== "dashboard";
    }
    if (savedSection) {
      savedSection.hidden = route.section !== "saved";
    }
    if (digestSection) {
      digestSection.hidden = route.section !== "digest";
    }
    if (proofSection) {
      proofSection.hidden = route.section !== "proof";
    }

    if (banner) {
      if (route.section === "dashboard" && !hasMeaningfulPreferences()) {
        banner.hidden = false;
      } else {
        banner.hidden = true;
      }
    }

    navLinks.forEach((link) => {
      const linkPath = link.getAttribute("data-route");
      if (!route.isNotFound && linkPath === route.path) {
        link.classList.add("jr-nav__link--active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("jr-nav__link--active");
        link.removeAttribute("aria-current");
      }
    });

    if (route.section === "dashboard") {
      renderDashboard();
    } else if (route.section === "saved") {
      renderSaved();
    } else if (route.section === "digest") {
      renderDigest();
    }
  }

  let currentRoutePath = null;

  function navigate(path, options = {}) {
    const { replace = false } = options;
    const route = findRoute(path);

    if (!route.isNotFound && route.path === currentRoutePath && !replace) {
      closeMobileNav();
      return;
    }

    const statePath = route.isNotFound ? path : route.path;
    const method = replace ? "replaceState" : "pushState";

    if (window.history && window.history[method]) {
      try {
        window.history[method](
          { routePath: route.path || path },
          "",
          statePath || path
        );
      } catch (error) {
        // Some environments (e.g. file://) may not allow pushState with these URLs.
        // In that case, we still render the route without modifying the URL.
      }
    }

    renderRoute(route);
    currentRoutePath = route.path || path;
    closeMobileNav();
  }

  function closeMobileNav() {
    const toggle = document.querySelector(".jr-nav__toggle");
    const links = document.querySelector(".jr-nav__links");
    if (!toggle || !links) return;
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("jr-nav__links--open");
  }

  function setupNavigation() {
    const navLinks = document.querySelectorAll(".jr-nav__link");
    const toggle = document.querySelector(".jr-nav__toggle");
    const links = document.querySelector(".jr-nav__links");
    const ctaButton = document.getElementById("jr-route-cta");

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const path = link.getAttribute("data-route");
        navigate(path);
      });
    });

    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        links.classList.toggle("jr-nav__links--open", !expanded);
      });
    }

    if (ctaButton) {
      ctaButton.addEventListener("click", () => {
        const target = ctaButton.dataset.targetRoute;
        if (target) {
          navigate(target);
        }
      });
    }

    setupPreferencesForm();
    setupDashboardInteractions();
    setupDigestInteractions();
    setupModalInteractions();
  }

  window.addEventListener("popstate", (event) => {
    const state = event.state;
    if (state && state.routePath && routes[state.routePath]) {
      renderRoute(routes[state.routePath]);
      return;
    }
    const fallbackPath = getInitialPath();
    renderRoute(findRoute(fallbackPath));
  });

  window.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    const initialPath = getInitialPath();
    const initialRoute = findRoute(initialPath);
    navigate(initialRoute.path, { replace: true });
    // Ensure modal starts closed in all environments.
    closeJobModal();
  });

  function loadPreferencesFromStorage() {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) {
        return {
          roleKeywords: [],
          preferredLocations: [],
          preferredModes: [],
          experienceLevel: "",
          skills: [],
          minMatchScore: 40,
        };
      }
      const parsed = JSON.parse(raw);
      return {
        roleKeywords: Array.isArray(parsed.roleKeywords) ? parsed.roleKeywords : [],
        preferredLocations: Array.isArray(parsed.preferredLocations) ? parsed.preferredLocations : [],
        preferredModes: Array.isArray(parsed.preferredModes) ? parsed.preferredModes : [],
        experienceLevel: typeof parsed.experienceLevel === "string" ? parsed.experienceLevel : "",
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        minMatchScore: typeof parsed.minMatchScore === "number" ? parsed.minMatchScore : 40,
      };
    } catch {
      return {
        roleKeywords: [],
        preferredLocations: [],
        preferredModes: [],
        experienceLevel: "",
        skills: [],
        minMatchScore: 40,
      };
    }
  }

  function savePreferencesToStorage(prefs) {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {}
  }

  function hasMeaningfulPreferences() {
    const prefs = currentPreferences;
    return (
      prefs.roleKeywords.length > 0 ||
      prefs.preferredLocations.length > 0 ||
      prefs.preferredModes.length > 0 ||
      !!prefs.experienceLevel ||
      prefs.skills.length > 0
    );
  }

  function normalizeCommaList(value) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.toLowerCase());
  }

  function setupPreferencesForm() {
    const roleInput = document.getElementById("jr-pref-role-keywords");
    const locationsSelect = document.getElementById("jr-pref-locations");
    const modeRemote = document.getElementById("jr-pref-mode-remote");
    const modeHybrid = document.getElementById("jr-pref-mode-hybrid");
    const modeOnsite = document.getElementById("jr-pref-mode-onsite");
    const experienceSelect = document.getElementById("jr-pref-experience");
    const skillsInput = document.getElementById("jr-pref-skills");
    const minScoreRange = document.getElementById("jr-pref-min-score");
    const minScoreValue = document.getElementById("jr-pref-min-score-value");
    if (!roleInput || !locationsSelect || !modeRemote || !modeHybrid || !modeOnsite || !experienceSelect || !skillsInput || !minScoreRange || !minScoreValue) return;
    roleInput.value = currentPreferences.roleKeywords.join(", ");
    skillsInput.value = currentPreferences.skills.join(", ");
    Array.from(locationsSelect.options).forEach((option) => {
      option.selected = currentPreferences.preferredLocations.includes(option.value);
    });
    modeRemote.checked = currentPreferences.preferredModes.includes("Remote");
    modeHybrid.checked = currentPreferences.preferredModes.includes("Hybrid");
    modeOnsite.checked = currentPreferences.preferredModes.includes("Onsite");
    experienceSelect.value = currentPreferences.experienceLevel || "";
    minScoreRange.value = String(currentPreferences.minMatchScore ?? 40);
    minScoreValue.textContent = String(currentPreferences.minMatchScore ?? 40);
    const persist = () => {
      currentPreferences = readPreferencesFromForm();
      savePreferencesToStorage(currentPreferences);
      const path = window.location.pathname === "/" ? "/" : window.location.pathname;
      const route = findRoute(path);
      if (route.section === "dashboard") renderDashboard();
      else if (route.section === "saved") renderSaved();
    };
    roleInput.addEventListener("input", persist);
    skillsInput.addEventListener("input", persist);
    locationsSelect.addEventListener("change", persist);
    modeRemote.addEventListener("change", persist);
    modeHybrid.addEventListener("change", persist);
    modeOnsite.addEventListener("change", persist);
    experienceSelect.addEventListener("change", persist);
    minScoreRange.addEventListener("input", () => { minScoreValue.textContent = minScoreRange.value; });
    minScoreRange.addEventListener("change", () => { minScoreValue.textContent = minScoreRange.value; persist(); });
  }

  function readPreferencesFromForm() {
    const roleInput = document.getElementById("jr-pref-role-keywords");
    const locationsSelect = document.getElementById("jr-pref-locations");
    const modeRemote = document.getElementById("jr-pref-mode-remote");
    const modeHybrid = document.getElementById("jr-pref-mode-hybrid");
    const modeOnsite = document.getElementById("jr-pref-mode-onsite");
    const experienceSelect = document.getElementById("jr-pref-experience");
    const skillsInput = document.getElementById("jr-pref-skills");
    const minScoreRange = document.getElementById("jr-pref-min-score");
    const roleKeywords = normalizeCommaList(roleInput?.value || "");
    const skills = normalizeCommaList(skillsInput?.value || "");
    const preferredLocations = locationsSelect ? Array.from(locationsSelect.selectedOptions).map((opt) => opt.value) : [];
    const preferredModes = [];
    if (modeRemote?.checked) preferredModes.push("Remote");
    if (modeHybrid?.checked) preferredModes.push("Hybrid");
    if (modeOnsite?.checked) preferredModes.push("Onsite");
    const experienceLevel = experienceSelect?.value || "";
    const minMatchScore = minScoreRange ? Number(minScoreRange.value || 40) : 40;
    return { roleKeywords, preferredLocations, preferredModes, experienceLevel, skills, minMatchScore };
  }

  const DIGEST_KEY_PREFIX = "jobTrackerDigest_";

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getDigestStorageKey(dateKey) {
    return DIGEST_KEY_PREFIX + (dateKey || getTodayKey());
  }

  function generateDigestJobs() {
    const scored = JOBS.map((job) => ({
      job,
      matchScore: computeMatchScore(job, currentPreferences),
    })).sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.job.postedDaysAgo - b.job.postedDaysAgo;
    });
    return scored.slice(0, 10).map(({ job, matchScore }) => ({ ...job, matchScore }));
  }

  function loadDigestForToday() {
    try {
      const raw = window.localStorage.getItem(getDigestStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveDigestForToday(jobs) {
    try {
      window.localStorage.setItem(getDigestStorageKey(), JSON.stringify(jobs));
    } catch {}
  }

  function getOrCreateDigest() {
    const existing = loadDigestForToday();
    if (existing !== null) return existing;
    const jobs = generateDigestJobs();
    saveDigestForToday(jobs);
    return jobs;
  }

  function formatDigestPlainText(jobs) {
    const list = Array.isArray(jobs) ? jobs : [];
    const lines = [
      "Top 10 Jobs For You — 9AM Digest",
      getTodayKey(),
      "",
      ...list.map((j, i) => {
        const title = j?.title ?? "";
        const company = j?.company ?? "";
        const location = j?.location ?? "";
        const experience = j?.experience ?? "";
        const score = j?.matchScore != null ? j.matchScore : "";
        return [
          `${i + 1}. ${title} — ${company}`,
          `   Location: ${location} | Experience: ${experience} | Match: ${score}%`,
        ].join("\n");
      }),
      "",
      "This digest was generated based on your preferences.",
    ];
    return lines.join("\n");
  }

  let lastDigestJobs = [];

  function renderDigest() {
    const blocking = document.getElementById("jr-digest-blocking");
    const noMatches = document.getElementById("jr-digest-no-matches");
    const generateRow = document.getElementById("jr-digest-generate-row");
    const cardContainer = document.getElementById("jr-digest-card-container");
    const dateEl = document.getElementById("jr-digest-date");
    const jobsContainer = document.getElementById("jr-digest-jobs");
    if (!blocking || !noMatches || !generateRow || !cardContainer || !dateEl || !jobsContainer) return;

    if (!hasMeaningfulPreferences()) {
      blocking.hidden = false;
      noMatches.hidden = true;
      generateRow.hidden = true;
      cardContainer.hidden = true;
      return;
    }
    blocking.hidden = true;
    generateRow.hidden = false;

    const existing = loadDigestForToday();
    const digestJobs = existing !== null ? existing : [];
    lastDigestJobs = digestJobs;

    if (existing === null) {
      noMatches.hidden = true;
      cardContainer.hidden = true;
      return;
    }
    if (digestJobs.length === 0) {
      noMatches.hidden = false;
      cardContainer.hidden = true;
      return;
    }
    noMatches.hidden = true;
    cardContainer.hidden = false;
    dateEl.textContent = getTodayKey();

    jobsContainer.innerHTML = "";
    digestJobs.forEach((item) => {
      const job = item.title ? item : { ...item, matchScore: computeMatchScore(item, currentPreferences) };
      const score = job.matchScore != null ? job.matchScore : computeMatchScore(job, currentPreferences);
      const row = document.createElement("div");
      row.className = "jr-digest-job";
      const titleEl = document.createElement("p");
      titleEl.className = "jr-heading-sm jr-digest-job-title";
      titleEl.textContent = job.title;
      const meta = document.createElement("p");
      meta.className = "jr-body-sm jr-digest-job-meta";
      meta.textContent = `${job.company} · ${job.location} · ${job.experience} years · ${score}% match`;
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "jr-button jr-button--primary jr-button--small";
      applyBtn.textContent = "Apply";
      applyBtn.addEventListener("click", () => window.open(getApplyUrl(job), "_blank", "noopener,noreferrer"));
      row.appendChild(titleEl);
      row.appendChild(meta);
      row.appendChild(applyBtn);
      jobsContainer.appendChild(row);
    });
  }

  function setupDigestInteractions() {
    const generateBtn = document.getElementById("jr-digest-generate-btn");
    const copyBtn = document.getElementById("jr-digest-copy-btn");
    const emailBtn = document.getElementById("jr-digest-email-btn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        getOrCreateDigest();
        renderDigest();
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const text = formatDigestPlainText(lastDigestJobs);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      });
    }
    if (emailBtn) {
      emailBtn.addEventListener("click", () => {
        const body = formatDigestPlainText(lastDigestJobs);
        const subject = encodeURIComponent("My 9AM Job Digest");
        const MAX_MAILTO_BODY_CHARS = 1200;
        const bodySafe = body.length <= MAX_MAILTO_BODY_CHARS ? body : body.substring(0, MAX_MAILTO_BODY_CHARS) + "\n\n[... digest truncated for email link length ...]";
        const bodyEncSafe = encodeURIComponent(bodySafe);
        window.location.href = `mailto:?subject=${subject}&body=${bodyEncSafe}`;
      });
    }
  }

  function getSavedJobIds() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setSavedJobIds(ids) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Ignore storage errors in read-only environments.
    }
  }

  function isJobSaved(id, savedIds) {
    return savedIds.includes(id);
  }

  const dashboardFilterState = {
    keyword: "",
    location: "",
    mode: "",
    experience: "",
    source: "",
    sort: "latest",
    showOnlyMatches: false,
  };

  function computeMatchScore(job, prefs) {
    let score = 0;
    const roleKeywords = prefs.roleKeywords || [];
    const skillsPrefs = prefs.skills || [];
    const preferredLocations = prefs.preferredLocations || [];
    const preferredModes = prefs.preferredModes || [];
    const experienceLevel = prefs.experienceLevel || "";
    const titleLower = job.title.toLowerCase();
    const descriptionLower = job.description.toLowerCase();
    const jobSkillsLower = job.skills.map((s) => s.toLowerCase());
    if (roleKeywords.length > 0) {
      if (roleKeywords.some((kw) => titleLower.includes(kw))) score += 25;
      if (roleKeywords.some((kw) => descriptionLower.includes(kw))) score += 15;
    }
    if (preferredLocations.length > 0 && preferredLocations.includes(job.location)) score += 15;
    if (preferredModes.length > 0 && preferredModes.includes(job.mode)) score += 10;
    if (experienceLevel && experienceLevel === job.experience) score += 10;
    if (skillsPrefs.length > 0 && skillsPrefs.some((skill) => jobSkillsLower.includes(skill))) score += 15;
    if (job.postedDaysAgo <= 2) score += 5;
    if (job.source === "LinkedIn") score += 5;
    return score > 100 ? 100 : score;
  }

  function getScoreBadgeClass(score) {
    if (score >= 80) return "jr-badge--score-high";
    if (score >= 60) return "jr-badge--score-mid";
    if (score >= 40) return "jr-badge--score-neutral";
    return "jr-badge--score-low";
  }

  function parseSalaryLower(salaryRange) {
    if (!salaryRange) return 0;
    const match = salaryRange.match(/(\d+(\.\d+)?)/);
    return match ? (Number.isNaN(parseFloat(match[1])) ? 0 : parseFloat(match[1])) : 0;
  }

  function getApplyUrl(job) {
    if (!job.applyUrl || job.applyUrl.includes("jobradar")) {
      const titleOnly = encodeURIComponent(job.title);
      const titleAndCompany = encodeURIComponent(`${job.title} ${job.company}`);
      if (job.source === "LinkedIn") return `https://www.linkedin.com/jobs/search/?keywords=${titleOnly}`;
      if (job.source === "Naukri") return `https://www.naukri.com/jobs-in-india?k=${titleAndCompany}`;
      if (job.source === "Indeed") return `https://www.indeed.com/jobs?q=${titleAndCompany}`;
      return `https://www.linkedin.com/jobs/search/?keywords=${titleOnly}`;
    }
    return job.applyUrl;
  }

  function renderDashboard() {
    const jobsContainer = document.getElementById("jr-dashboard-jobs");
    const emptyMessage = document.getElementById("jr-dashboard-empty-message");
    if (!jobsContainer || !emptyMessage) return;
    const savedIds = getSavedJobIds();
    const minScore = currentPreferences.minMatchScore ?? 40;
    const scoredJobs = JOBS.map((job) => ({ job, matchScore: computeMatchScore(job, currentPreferences) }));
    let list = scoredJobs;
    if (dashboardFilterState.keyword) {
      const keyword = dashboardFilterState.keyword.toLowerCase();
      list = list.filter(({ job }) =>
        job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword)
      );
    }
    if (dashboardFilterState.location) list = list.filter(({ job }) => job.location === dashboardFilterState.location);
    if (dashboardFilterState.mode) list = list.filter(({ job }) => job.mode === dashboardFilterState.mode);
    if (dashboardFilterState.experience) list = list.filter(({ job }) => job.experience === dashboardFilterState.experience);
    if (dashboardFilterState.source) list = list.filter(({ job }) => job.source === dashboardFilterState.source);
    if (dashboardFilterState.showOnlyMatches) list = list.filter(({ matchScore }) => matchScore >= minScore);
    if (dashboardFilterState.sort === "latest") list.sort((a, b) => a.job.postedDaysAgo - b.job.postedDaysAgo);
    else if (dashboardFilterState.sort === "match") list.sort((a, b) => b.matchScore - a.matchScore);
    else if (dashboardFilterState.sort === "salary") list.sort((a, b) => parseSalaryLower(b.job.salaryRange) - parseSalaryLower(a.job.salaryRange));
    jobsContainer.innerHTML = "";
    if (list.length === 0) { emptyMessage.hidden = false; return; }
    emptyMessage.hidden = true;
    list.forEach(({ job, matchScore }) => {
      const card = document.createElement("article");
      card.className = "jr-card jr-job-card";
      card.dataset.jobId = job.id;
      const body = document.createElement("div");
      body.className = "jr-card__body jr-stack-16";
      const header = document.createElement("div");
      header.className = "jr-job-card__header";
      const titleBlock = document.createElement("div");
      titleBlock.className = "jr-job-card__title-block";
      const titleEl = document.createElement("h3");
      titleEl.className = "jr-heading-sm";
      titleEl.textContent = job.title;
      const companyEl = document.createElement("p");
      companyEl.className = "jr-body-sm";
      companyEl.textContent = job.company;
      titleBlock.appendChild(titleEl);
      titleBlock.appendChild(companyEl);
      const rightBlock = document.createElement("div");
      rightBlock.className = "jr-job-card__right";
      const sourceBadge = document.createElement("span");
      sourceBadge.className = "jr-badge jr-badge--source";
      sourceBadge.textContent = job.source;
      const scoreBadge = document.createElement("span");
      scoreBadge.className = `jr-badge ${getScoreBadgeClass(matchScore)}`;
      scoreBadge.textContent = `${matchScore}% match`;
      header.appendChild(titleBlock);
      rightBlock.appendChild(sourceBadge);
      rightBlock.appendChild(scoreBadge);
      header.appendChild(rightBlock);
      const meta = document.createElement("div");
      meta.className = "jr-job-card__meta";
      meta.innerHTML = [`${job.location} · ${job.mode}`, `${job.experience} years`, job.salaryRange, `${job.postedDaysAgo === 0 ? "Today" : `${job.postedDaysAgo} days ago`}`].map((text) => `<span>${text}</span>`).join("");
      const footer = document.createElement("div");
      footer.className = "jr-job-card__footer";
      const actions = document.createElement("div");
      actions.className = "jr-job-card__actions";
      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "jr-button jr-button--secondary";
      viewBtn.dataset.action = "view";
      viewBtn.dataset.jobId = job.id;
      viewBtn.textContent = "View";
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "jr-button jr-button--secondary";
      saveBtn.dataset.action = "save";
      saveBtn.dataset.jobId = job.id;
      saveBtn.textContent = isJobSaved(job.id, savedIds) ? "Saved" : "Save";
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "jr-button jr-button--primary";
      applyBtn.dataset.action = "apply";
      applyBtn.dataset.jobId = job.id;
      applyBtn.textContent = "Apply";
      actions.appendChild(viewBtn);
      actions.appendChild(saveBtn);
      actions.appendChild(applyBtn);
      const savedLabel = document.createElement("span");
      savedLabel.className = "jr-job-card__saved-label";
      savedLabel.textContent = isJobSaved(job.id, savedIds) ? "Saved to your list" : "";
      footer.appendChild(actions);
      footer.appendChild(savedLabel);
      body.appendChild(header);
      body.appendChild(meta);
      body.appendChild(footer);
      card.appendChild(body);
      jobsContainer.appendChild(card);
    });
  }

  function renderSaved() {
    const savedContainer = document.getElementById("jr-saved-jobs");
    const emptyMessage = document.getElementById("jr-saved-empty-message");
    if (!savedContainer || !emptyMessage) return;

    const savedIds = getSavedJobIds();
    const savedJobs = JOBS.filter((job) => savedIds.includes(job.id));

    savedContainer.innerHTML = "";

    if (savedJobs.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    emptyMessage.hidden = true;

    savedJobs.forEach((job) => {
      const card = document.createElement("article");
      card.className = "jr-card jr-job-card";
      card.dataset.jobId = job.id;

      const body = document.createElement("div");
      body.className = "jr-card__body jr-stack-16";

      const header = document.createElement("div");
      header.className = "jr-job-card__header";

      const titleBlock = document.createElement("div");
      titleBlock.className = "jr-job-card__title-block";

      const titleEl = document.createElement("h3");
      titleEl.className = "jr-heading-sm";
      titleEl.textContent = job.title;

      const companyEl = document.createElement("p");
      companyEl.className = "jr-body-sm";
      companyEl.textContent = job.company;

      titleBlock.appendChild(titleEl);
      titleBlock.appendChild(companyEl);

      const rightBlock = document.createElement("div");
      rightBlock.className = "jr-job-card__right";
      const sourceBadge = document.createElement("span");
      sourceBadge.className = "jr-badge jr-badge--source";
      sourceBadge.textContent = job.source;
      const score = computeMatchScore(job, currentPreferences);
      const scoreBadge = document.createElement("span");
      scoreBadge.className = `jr-badge ${getScoreBadgeClass(score)}`;
      scoreBadge.textContent = `${score}% match`;
      header.appendChild(titleBlock);
      rightBlock.appendChild(sourceBadge);
      rightBlock.appendChild(scoreBadge);
      header.appendChild(rightBlock);

      const meta = document.createElement("div");
      meta.className = "jr-job-card__meta";
      meta.innerHTML = [
        `${job.location} · ${job.mode}`,
        `${job.experience} years`,
        job.salaryRange,
        `${job.postedDaysAgo === 0 ? "Today" : `${job.postedDaysAgo} days ago`}`,
      ]
        .map((text) => `<span>${text}</span>`)
        .join("");

      const footer = document.createElement("div");
      footer.className = "jr-job-card__footer";

      const actions = document.createElement("div");
      actions.className = "jr-job-card__actions";

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "jr-button jr-button--secondary";
      viewBtn.dataset.action = "view";
      viewBtn.dataset.jobId = job.id;
      viewBtn.textContent = "View";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "jr-button jr-button--secondary";
      removeBtn.dataset.action = "save";
      removeBtn.dataset.jobId = job.id;
      removeBtn.textContent = "Remove";

      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "jr-button jr-button--primary";
      applyBtn.dataset.action = "apply";
      applyBtn.dataset.jobId = job.id;
      applyBtn.textContent = "Apply";

      actions.appendChild(viewBtn);
      actions.appendChild(removeBtn);
      actions.appendChild(applyBtn);

      footer.appendChild(actions);

      body.appendChild(header);
      body.appendChild(meta);
      body.appendChild(footer);

      card.appendChild(body);
      savedContainer.appendChild(card);
    });
  }

  function setupDashboardInteractions() {
    const jobsContainer = document.getElementById("jr-dashboard-jobs");
    const savedContainer = document.getElementById("jr-saved-jobs");

    if (jobsContainer) {
      jobsContainer.addEventListener("click", handleJobsClick);
    }

    if (savedContainer) {
      savedContainer.addEventListener("click", handleJobsClick);
    }

    const keywordInput = document.getElementById("jr-filter-keyword");
    const locationSelect = document.getElementById("jr-filter-location");
    const modeSelect = document.getElementById("jr-filter-mode");
    const experienceSelect = document.getElementById("jr-filter-experience");
    const sourceSelect = document.getElementById("jr-filter-source");
    const sortSelect = document.getElementById("jr-filter-sort");

    populateLocationFilter(locationSelect);

    if (keywordInput) {
      let keywordDebounceId = null;
      const applyKeywordFilter = () => {
        if (keywordDebounceId) clearTimeout(keywordDebounceId);
        keywordDebounceId = null;
        dashboardFilterState.keyword = keywordInput.value.trim();
        renderDashboard();
      };
      keywordInput.addEventListener("input", () => {
        if (keywordDebounceId) clearTimeout(keywordDebounceId);
        keywordDebounceId = setTimeout(applyKeywordFilter, 200);
      });
      keywordInput.addEventListener("blur", applyKeywordFilter);
    }

    if (locationSelect) {
      locationSelect.addEventListener("change", () => {
        dashboardFilterState.location = locationSelect.value;
        renderDashboard();
      });
    }

    if (modeSelect) {
      modeSelect.addEventListener("change", () => {
        dashboardFilterState.mode = modeSelect.value;
        renderDashboard();
      });
    }

    if (experienceSelect) {
      experienceSelect.addEventListener("change", () => {
        dashboardFilterState.experience = experienceSelect.value;
        renderDashboard();
      });
    }

    if (sourceSelect) {
      sourceSelect.addEventListener("change", () => {
        dashboardFilterState.source = sourceSelect.value;
        renderDashboard();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        dashboardFilterState.sort = sortSelect.value || "latest";
        renderDashboard();
      });
    }

    const onlyMatchesCheckbox = document.getElementById("jr-filter-only-matches");
    if (onlyMatchesCheckbox) {
      onlyMatchesCheckbox.checked = dashboardFilterState.showOnlyMatches;
      onlyMatchesCheckbox.addEventListener("change", () => {
        dashboardFilterState.showOnlyMatches = !!onlyMatchesCheckbox.checked;
        renderDashboard();
      });
    }
  }

  function handleJobsClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const jobId = actionEl.dataset.jobId;
    if (!jobId) return;

    const job = JOBS.find((j) => j.id === jobId);
    if (!job) return;

    if (action === "view") {
      openJobModal(job);
    } else if (action === "apply") {
      window.open(getApplyUrl(job), "_blank", "noopener,noreferrer");
    } else if (action === "save") {
      const savedIds = getSavedJobIds();
      const exists = savedIds.includes(job.id);
      const next = exists
        ? savedIds.filter((id) => id !== job.id)
        : savedIds.concat(job.id);
      setSavedJobIds(next);
      renderDashboard();
      renderSaved();
    }
  }

  function setupModalInteractions() {
    const modal = document.getElementById("jr-job-modal");
    const closeBtn = document.getElementById("jr-modal-close");

    if (!modal || !closeBtn) return;

    closeBtn.addEventListener("click", () => {
      closeJobModal();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeJobModal();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeJobModal();
      }
    });
  }

  function openJobModal(job) {
    const modal = document.getElementById("jr-job-modal");
    const titleEl = document.getElementById("jr-modal-title");
    const companyEl = document.getElementById("jr-modal-company");
    const descriptionEl = document.getElementById("jr-modal-description");
    const skillsEl = document.getElementById("jr-modal-skills");

    if (!modal || !titleEl || !companyEl || !descriptionEl || !skillsEl) {
      return;
    }

    titleEl.textContent = job.title;
    companyEl.textContent = `${job.company} · ${job.location} · ${job.mode}`;
    descriptionEl.textContent = job.description;

    skillsEl.innerHTML = "";
    job.skills.forEach((skill) => {
      const chip = document.createElement("span");
      chip.className = "jr-badge";
      chip.textContent = skill;
      skillsEl.appendChild(chip);
    });

    modal.hidden = false;
    modal.style.display = "flex";
  }

  function closeJobModal() {
    const modal = document.getElementById("jr-job-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.style.display = "none";
  }

  function populateLocationFilter(select) {
    if (!select) return;
    const locations = Array.from(
      new Set(JOBS.map((job) => job.location))
    ).sort();

    locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location;
      option.textContent = location;
      select.appendChild(option);
    });
  }

  function createJobsDataset() {
    const companies = [
      "Infosys",
      "TCS",
      "Wipro",
      "Accenture",
      "Capgemini",
      "Cognizant",
      "IBM",
      "Oracle",
      "SAP",
      "Dell",
      "Amazon",
      "Flipkart",
      "Swiggy",
      "Razorpay",
      "PhonePe",
      "Paytm",
      "Zoho",
      "Freshworks",
      "Juspay",
      "CRED",
      "ClearStack Labs",
      "Northwind Digital",
      "Skyline Techworks",
      "BlueRiver Systems",
      "Nimbus Analytics",
    ];

    const titles = [
      "SDE Intern",
      "Graduate Engineer Trainee",
      "Junior Backend Developer",
      "Frontend Intern",
      "Frontend Developer",
      "Full-Stack Developer",
      "QA Intern",
      "Web Developer",
      "Data Analyst Intern",
      "Java Developer (0-1)",
      "Python Developer (Fresher)",
      "React Developer (1-3)",
      "Associate Engineer",
      "Software Developer",
      "React Developer",
      "MERN Developer",
      "System Support Engineer",
      "Junior Web Developer",
      "System Engineer",
      "Software Analyst",
      "Programmer Analyst",
      "QA Engineer / Test Engineer",
      "Automation Test Engineer",
    ];

    const locations = [
      "Bengaluru",
      "Hyderabad",
      "Pune",
      "Chennai",
      "Gurugram",
      "Noida",
      "Mumbai",
      "Kochi",
      "Jaipur",
      "Ahmedabad",
    ];

    const modes = ["Remote", "Hybrid", "Onsite"];
    const experiences = ["Fresher", "0-1", "1-3", "3-5"];
    const sources = ["LinkedIn", "Naukri", "Indeed"];
    const salaryRanges = [
      "3–5 LPA",
      "6–10 LPA",
      "10–18 LPA",
      "₹15k–₹40k/month Internship",
    ];

    const skillsPool = [
      "Java",
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "Spring Boot",
      "SQL",
      "NoSQL",
      "REST APIs",
      "HTML & CSS",
      "Git",
      "AWS",
      "Docker",
      "Kubernetes",
      "Jest",
      "Cypress",
      "Data Structures",
      "Algorithms",
    ];

    const descriptionTemplates = [
      (company, title, location) =>
        `${company} is expanding its engineering team in ${location} and looking for a ${title} who is comfortable working in a structured, modern codebase. You will work with clean APIs, code reviews, and a predictable release cadence. The role emphasizes learning, pairing with senior engineers, and writing maintainable code over quick hacks.`,
      (company, title, location) =>
        `Join the product engineering group at ${company} as a ${title} based in ${location}. You will help ship small, well-tested changes that improve reliability and usability. Expect a calm environment, clear expectations, and time to do deep work on real user problems.`,
      (company, title, location) =>
        `${company} is hiring a ${title} in ${location} to work on internal tools and customer-facing features. You will collaborate with design and QA, follow established patterns, and contribute to technical discussions without being rushed. The team values clear communication, thoughtful documentation, and pragmatic solutions.`,
      (company, title, location) =>
        `As a ${title} at ${company} in ${location}, you will contribute to services used by thousands of users every day. You will work with modern tooling, learn from experienced mentors, and participate in regular feedback loops. The focus is on stability, incremental improvements, and building confidence in every release.`,
      (company, title, location) =>
        `${company} is looking for a ${title} to join a cross-functional squad in ${location}. You will spend your time pairing on features, refining requirements with product, and improving test coverage. The team avoids heroics and favors small, deliberate deployments backed by monitoring and clear rollback paths.`,
    ];

    const jobs = [];

    for (let index = 0; index < 60; index += 1) {
      const company = companies[index % companies.length];
      const title = titles[index % titles.length];
      const location = locations[index % locations.length];
      const mode = modes[index % modes.length];
      const experience = experiences[index % experiences.length];
      const source = sources[index % sources.length];
      const salaryRange = salaryRanges[index % salaryRanges.length];
      const postedDaysAgo = index % 11;

      const descriptionTemplate =
        descriptionTemplates[index % descriptionTemplates.length];

      const skills = [];
      for (let s = 0; s < 4; s += 1) {
        const skill =
          skillsPool[(index + s * 3) % skillsPool.length];
        if (!skills.includes(skill)) {
          skills.push(skill);
        }
      }

      const domain =
        source === "LinkedIn"
          ? "linkedin.com"
          : source === "Naukri"
          ? "naukri.com"
          : "indeed.com";

      const job = {
        id: `job-${index + 1}`,
        title,
        company,
        location,
        mode,
        experience,
        skills,
        source,
        postedDaysAgo,
        salaryRange,
        applyUrl: `https://${domain}/jobs/jobradar-${index + 1}`,
        description: descriptionTemplate(company, title, location),
      };

      jobs.push(job);
    }

    return jobs;
  }
})();
