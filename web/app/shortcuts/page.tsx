import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "iPhone Shortcuts — Touch Grass National Park",
  description:
    "Make opening a blocked app bounce straight to the park instead of a dead feed.",
};

// iOS gap: NextDNS closes the trail, but tapping the app still shows a
// generic connection error instead of the park. This Shortcuts automation
// turns app-open into park-open — the ranger meets you at the trailhead.

const PARK_URL = "https://touchgrass.mikegrowsgreens.com";

const steps: { title: string; body: React.ReactNode }[] = [
  {
    title: "Open the Shortcuts app",
    body: (
      <>
        It ships with every iPhone. If it&apos;s been deleted, reinstall{" "}
        <strong>Shortcuts</strong> free from the App Store.
      </>
    ),
  },
  {
    title: "Start a new automation",
    body: (
      <>
        Bottom tab <strong>Automation</strong> → <strong>+</strong> (New
        Automation) → scroll to <strong>App</strong>.
      </>
    ),
  },
  {
    title: "Pick the trail",
    body: (
      <>
        <strong>Choose</strong> → select Instagram (or whichever closure) →{" "}
        <strong>Is Opened</strong> → <strong>Run Immediately</strong> →{" "}
        <strong>Next</strong>. &ldquo;Run Immediately&rdquo; matters — otherwise iOS
        asks permission every time, which defeats the ranger.
      </>
    ),
  },
  {
    title: "Send it to the park",
    body: (
      <>
        Tap <strong>New Blank Automation</strong> → <strong>Add Action</strong> →
        search <strong>&ldquo;Open URLs&rdquo;</strong> → set the URL to{" "}
        <span className="pass-code" style={{ fontSize: 13 }}>
          {PARK_URL}
        </span>{" "}
        → <strong>Done</strong>.
      </>
    ),
  },
  {
    title: "Repeat per closure",
    body: (
      <>
        One automation per app. Two minutes each, and every doomscroll reflex now
        walks you to the trailhead instead.
      </>
    ),
  },
];

export default function Shortcuts() {
  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="sign">
        <p className="park-sub" style={{ marginTop: 0 }}>
          Ranger field guide · iPhone
        </p>
        <h1 className="park-name mt-2">App → Park</h1>

        <p className="notice mt-6 mb-2">
          Tapping the app should open the park, not a dead feed.
        </p>
        <p className="text-center text-[14px] mb-6" style={{ color: "var(--faded)" }}>
          NextDNS closes the trail phone-wide, but iOS shows a plain connection
          error when you tap a blocked app. One Shortcuts automation per app fixes
          that: the moment it opens, you&apos;re standing at the park gate instead.
        </p>

        <ol className="flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="closure-row" style={{ alignItems: "flex-start" }}>
              <span
                className="caps-label"
                style={{ color: "var(--rust)", whiteSpace: "nowrap", paddingTop: 2 }}
              >
                {i + 1}.
              </span>
              <span className="flex-1 text-[14px] leading-relaxed">
                <strong className="block mb-1" style={{ color: "var(--pine)" }}>
                  {s.title}
                </strong>
                {s.body}
              </span>
            </li>
          ))}
        </ol>

        <p className="caps-label text-center mt-6">
          android? private dns already dead-ends the apps — no shortcut needed
        </p>

        <div className="dashed-rule mt-6 pt-4 flex items-center justify-between">
          <Link href="/" className="permit-link">
            ← the park
          </Link>
          <Link href="/setup" className="permit-link">
            ranger station →
          </Link>
        </div>
      </div>
    </main>
  );
}
