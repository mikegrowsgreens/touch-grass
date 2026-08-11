// Giphy proxy — keeps Mike's Giphy key server-side (env GIPHY_API_KEY),
// out of the client bundle. Cats never hit this route (cataas is keyless).

const THEME_TERMS: Record<string, string[]> = {
  dogs: ["funny dog", "puppy", "dog party", "good dog", "dog zoomies"],
  nature: ["nature", "forest", "mountain river", "sunrise timelapse", "ocean waves", "wildlife"],
  funny: ["fail", "blooper", "funny animals", "wait for it", "laughing"],
};

export async function GET(request: Request) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return Response.json({ error: "trail cam offline (no key configured)" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const theme = searchParams.get("theme") ?? "";
  const customTerms = (searchParams.get("terms") ?? "")
    .split(",")
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 5);

  const pool = theme === "custom" && customTerms.length > 0 ? customTerms : THEME_TERMS[theme];
  if (!pool) {
    return Response.json({ error: "unknown theme" }, { status: 400 });
  }

  const term = pool[Math.floor(Math.random() * pool.length)];
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(key)}&tag=${encodeURIComponent(term)}&rating=pg`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`giphy ${res.status}`);
    const json = await res.json();
    const url: string | undefined =
      json?.data?.images?.downsized_medium?.url || json?.data?.images?.original?.url;
    if (!url) throw new Error("giphy returned no gif");
    return Response.json({ url });
  } catch {
    return Response.json({ error: "trail cam glitched" }, { status: 502 });
  }
}
