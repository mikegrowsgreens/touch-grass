"use client";

// Phone setup guides — Private DNS walkthrough + Add-to-Home-Screen, each
// with Android/iOS tabs. Shared by /setup steps 5–6; DNS guide personalizes
// the hostname when the ranger radio (NextDNS creds) is connected.

import { useState } from "react";
import Link from "next/link";
import { loadCreds } from "@/lib/nextdns";
import { defaultTab, detectPlatform } from "@/lib/platform";
import { useHydrated } from "@/lib/useHydrated";

type Tab = "android" | "ios" | "computer";

const TAB_LABELS: Record<Tab, string> = {
  android: "Android",
  ios: "iPhone / iPad",
  computer: "Computer",
};

function usePlatformTab(allowed: readonly Tab[]): [Tab, (t: Tab) => void, boolean] {
  const hydrated = useHydrated();
  const [pick, setPick] = useState<Tab | null>(null);
  const detected = hydrated
    ? defaultTab(detectPlatform(navigator.userAgent, navigator.maxTouchPoints))
    : "android";
  const tab = pick ?? (allowed.includes(detected) ? detected : "android");
  return [tab, setPick, hydrated];
}

function PlatformTabs({
  tabs,
  tab,
  onPick,
}: {
  tabs: readonly Tab[];
  tab: Tab;
  onPick: (t: Tab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          className="chip"
          aria-pressed={tab === t}
          onClick={() => onPick(t)}
        >
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

const stepList = "list-decimal pl-5 text-[14px] leading-relaxed flex flex-col gap-2";
const faded = { color: "var(--faded)" } as const;

export function PrivateDnsGuide() {
  const [tab, setTab, hydrated] = usePlatformTab(["android", "ios", "computer"]);
  const creds = hydrated ? loadCreds() : null;
  const host = `${creds?.profileId ?? "yourprofileid"}.dns.nextdns.io`;
  const dohUrl = `https://dns.nextdns.io/${creds?.profileId ?? "yourprofileid"}`;
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the value is selectable above */
    }
  };
  const copyHost = () => copy(host);

  return (
    <section>
      <span className="field-label">Point your device at NextDNS</span>
      <p className="text-[13px] mb-3" style={faded}>
        This is the switch that actually closes the trails — at the network, not
        in an app someone (you) can switch off. Extensions and apps are the park
        scenery; DNS is the gate.
        {!creds && (
          <>
            {" "}
            No radio connected yet — the steps below use a placeholder profile ID;
            yours replaces <strong>yourprofileid</strong>.
          </>
        )}
      </p>

      <PlatformTabs tabs={["android", "ios", "computer"]} tab={tab} onPick={setTab} />

      {tab === "computer" && (
        <>
          <ol className={stepList}>
            <li>
              In Chrome or Brave, open <strong>Settings → Privacy and security →
              Security</strong> and find <strong>Use secure DNS</strong>
            </li>
            <li>
              Pick <strong>With: Custom</strong> and paste your park&apos;s address:
            </li>
          </ol>
          <div className="flex items-center gap-2 mt-2">
            <span className="field pass-code" style={{ background: "var(--cream-dark)" }}>
              {dohUrl}
            </span>
            <button type="button" className="chip" onClick={() => copy(dohUrl)}>
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <p className="text-[13px] mt-3" style={faded}>
            Now the browser itself asks NextDNS, so the trails stay closed even
            with the extension switched off. For every browser and app on a Mac
            at once, install the profile from{" "}
            <a
              className="permit-link"
              href="https://apple.nextdns.io"
              target="_blank"
              rel="noreferrer"
            >
              apple.nextdns.io
            </a>{" "}
            instead — same two minutes, whole machine.
          </p>
        </>
      )}
      {tab === "android" && (
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
      )}
      {tab === "ios" && (
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
  const [tab, setTab] = usePlatformTab(["android", "ios"]);

  return (
    <section>
      <span className="field-label">Put the park on your home screen</span>
      <p className="text-[13px] mb-3" style={faded}>
        Installed, the park opens full-screen like any app — streak, trail cam, and
        pass gate one tap from where the doomscroll app used to sit.
      </p>

      <PlatformTabs tabs={["android", "ios"]} tab={tab} onPick={setTab} />

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
