const DEFAULTS = {
  blocklist: ["facebook.com", "instagram.com", "threads.net", "linkedin.com", "strava.com"],
  giphyKey: "",
  blocksDodged: 0,
  pauseAllUntil: 0,
  pauseLinkedinUntil: 0
};

async function load() {
  const s = await chrome.storage.local.get(DEFAULTS);
  document.getElementById("domains").value = s.blocklist.join("\n");
  document.getElementById("giphyKey").value = s.giphyKey;

  const now = Date.now();
  let pause = "";
  if (s.pauseAllUntil > now) {
    pause = ` · paused (all) until ${new Date(s.pauseAllUntil).toLocaleTimeString()}`;
  } else if (s.pauseLinkedinUntil > now) {
    pause = ` · LinkedIn work session until ${new Date(s.pauseLinkedinUntil).toLocaleTimeString()}`;
  }
  document.getElementById("stats").textContent = `Feeds dodged so far: ${s.blocksDodged}${pause}`;
}

document.getElementById("save").addEventListener("click", async () => {
  const blocklist = document
    .getElementById("domains")
    .value.split("\n")
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""))
    .filter(Boolean);
  const giphyKey = document.getElementById("giphyKey").value.trim();

  await chrome.storage.local.set({ blocklist, giphyKey });
  chrome.runtime.sendMessage({ type: "rebuild" });

  const saved = document.getElementById("saved");
  saved.style.display = "inline";
  setTimeout(() => (saved.style.display = "none"), 1500);
});

load();
