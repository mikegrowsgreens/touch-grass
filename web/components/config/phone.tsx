"use client";

// Phone setup guides — Private DNS walkthrough + Add-to-Home-Screen, each
// with Android/iOS tabs. Shared by /setup steps 5–6; DNS guide personalizes
// the hostname when the ranger radio (NextDNS creds) is connected.

import { useState } from "react";
import Link from "next/link";
import { loadCreds } from "@/lib/nextdns";
import { defaultTab, detectPlatform } from "@/lib/platform";
import { useHydrated } from "@/lib/useHydrated";

type Tab = "android" | "ios";

function usePlatformTab(): [Tab, (t: Tab) => void, boolean] {
  const hydrated = useHydrated();
  const [pick, setPick] = useState<Tab | null>(null);
  const tab =
    pick ??
    (hydrated
      ? defaultTab(detectPlatform(navigator.userAgent, navigator.maxTouchPoints))
      : "android");
  return [tab, setPick, hydrated];
}

function PlatformTabs({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  return (
    <div className="flex gap-2 mb-4">
      {(["android", "ios"] as const).map((t) => (
        <button
          key={t}
          type="button"
          className="chip"
          aria-pressed={tab === t}
          onClick={() => onPick(t)}
        >
          {t === "android" ? "Android" : "iPhone / iPad"}
        </button>
      ))}
    </div>
  );
}

const stepList = "list-decimal pl-5 text-[14px] leading-relaxed flex flex-col gap-2";
const faded = { color: "var(--faded)" } as const;

export function PrivateDnsGuide() {
  const [tab, setTab, hydrated] = usePlatformTab();
  const creds = hydrated ? loadCreds() : null;
  const host = `${creds?.profileId ?? "yourprofileid"}.dns.nextdns.io`;
  const [copied, setCopied] = useState(false);

  const copyHost = async () => {
    try {
      await navigator.clipboard.writeText(host);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — hostname is selectable above */
    }
  };

  return (
    <section>
      <span className="field-label">Point your phone at NextDNS</span>
      <p className="text-[13px] mb-3" style={faded}>
        This is the switch that closes the trails phone-wide — apps and browsers
        both. One setting, no app install required on Android.
        {!creds && (
          <>
            {" "}
            No radio connected yet — the steps below use a placeholder profile ID;
            yours replaces <strong>yourprofileid</strong>.
          </>
        )}
      </p>

      <PlatformTabs tab={tab} onPick={setTab} />

      {tab === "android" ? (
        <>
          <ol className={stepList}>
            <li>
              Open <strong>Settings → Network &amp; internet → Private DNS</strong>
              <span style={faded}>
                {" "}
                (Samsung: Settings → Connections → More connection settings → Private
                DNS)
              </span>
            </li>
            <li>
              Choose <strong>Private DNS provider hostname</strong>
            </li>
            <li>Paste your park hostname:</li>
          </ol>
          <div className="flex items-center gap-2 mt-2">
            <span className="field pass-code" style={{ background: "var(--cream-dark)" }}>
              {host}
            </span>
            <button type="button" className="chip" onClick={copyHost}>
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <p className="text-[13px] mt-3" style={faded}>
            Save, then open one of your closed trails in the browser — a dead end
            means the closure is holding.
          </p>
        </>
      ) : (
        <>
          <ol className={stepList}>
            <li>
              On the phone, open{" "}
              <a
                className="permit-link"
                href="https://apple.nextdns.io"
                target="_blank"
                rel="noreferrer"
              >
                apple.nextdns.io
              </a>{" "}
              in Safari and enter your profile ID
              {creds ? (
                <>
                  {" "}
                  (<strong>{creds.profileId}</strong>)
                </>
              ) : null}
            </li>
            <li>
              Download the configuration profile, then install it via{" "}
              <strong>Settings → General → VPN &amp; Device Management</strong>
            </li>
            <li>
              Prefer an app? The free <strong>NextDNS</strong> app on the App Store
              does the same with a toggle
            </li>
          </ol>
          <p className="text-[13px] mt-3" style={faded}>
            Apple routes all DNS through the profile — apps included. Test by
            opening a closed trail in Safari.
          </p>
        </>
      )}
    </section>
  );
}

export function HomeScreenGuide() {
  const [tab, setTab] = usePlatformTab();

  return (
    <section>
      <span className="field-label">Put the park on your home screen</span>
      <p className="text-[13px] mb-3" style={faded}>
        Installed, the park opens full-screen like any app — streak, trail cam, and
        pass gate one tap from where the doomscroll app used to sit.
      </p>

      <PlatformTabs tab={tab} onPick={setTab} />

      {tab === "android" ? (
        <ol className={stepList}>
          <li>
            Open <strong>touchgrass.mikegrowsgreens.com</strong> in Chrome
          </li>
          <li>
            Tap the <strong>⋮ menu → Add to Home screen</strong> (or{" "}
            <strong>Install app</strong>)
          </li>
          <li>
            Drop the park icon where the blocked app used to live — muscle memory
            works for you now
          </li>
        </ol>
      ) : (
        <>
          <ol className={stepList}>
            <li>
              Open <strong>touchgrass.mikegrowsgreens.com</strong> in{" "}
              <strong>Safari</strong> (other browsers can&apos;t install)
            </li>
            <li>
              Tap the <strong>share button</strong> (square with arrow) →{" "}
              <strong>Add to Home Screen</strong>
            </li>
            <li>Swap it into the blocked app&apos;s old spot</li>
          </ol>
          <p className="text-[13px] mt-3" style={faded}>
            Bonus ranger trick: make opening Instagram literally open the park
            instead —{" "}
            <Link href="/shortcuts" className="permit-link">
              the iPhone Shortcuts guide
            </Link>
            .
          </p>
        </>
      )}
    </section>
  );
}
