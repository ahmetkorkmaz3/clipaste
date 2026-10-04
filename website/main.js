// Highlights the download for the visitor's system and links the buttons
// straight to the files of the latest GitHub release.
(function () {
  const ua = navigator.userAgent;
  const os = /Mac/.test(ua) ? "mac" : /Win/.test(ua) ? "windows" : /Linux|X11/.test(ua) ? "linux" : null;
  const names = { mac: "macOS", windows: "Windows", linux: "Linux" };

  if (os) {
    document.getElementById("hero-os").textContent = names[os];
    document.querySelector(`.download[data-os="${os}"]`)?.classList.add("recommended");
  }

  fetch("https://api.github.com/repos/ahmetkorkmaz3/clipaste/releases/latest")
    .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
    .then((release) => {
      document.getElementById("latest-version").textContent = release.tag_name.replace(/^v/, "");
      document.querySelectorAll("[data-asset]").forEach((link) => {
        const asset = release.assets.find((a) => a.name.endsWith(link.dataset.asset));
        if (asset) link.href = asset.browser_download_url;
      });
    })
    .catch(() => {
      // The buttons keep their link to the releases page.
    });
})();
