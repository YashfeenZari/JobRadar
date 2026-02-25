(() => {
  const routes = {
    "/": {
      path: "/",
      title: "Dashboard",
      subtitle: "This section will be built in the next step.",
    },
    "/dashboard": {
      path: "/dashboard",
      title: "Dashboard",
      subtitle: "This section will be built in the next step.",
    },
    "/saved": {
      path: "/saved",
      title: "Saved",
      subtitle: "This section will be built in the next step.",
    },
    "/digest": {
      path: "/digest",
      title: "Digest",
      subtitle: "This section will be built in the next step.",
    },
    "/settings": {
      path: "/settings",
      title: "Settings",
      subtitle: "This section will be built in the next step.",
    },
    "/proof": {
      path: "/proof",
      title: "Proof",
      subtitle: "This section will be built in the next step.",
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
    return routes[pathname] ? pathname : "/";
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

    if (!pageTitleEl || !pageSubtitleEl || !routeHeadingEl || !routeSubtextEl) {
      return;
    }

    pageTitleEl.textContent = route.title;
    pageSubtitleEl.textContent = route.subtitle;
    routeHeadingEl.textContent = route.title;
    routeSubtextEl.textContent = route.subtitle;

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
  });
})();
