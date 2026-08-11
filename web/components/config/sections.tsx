"use client";

// Ranger-station form sections, shared by /setup (one per step) and
// /settings (all stacked). Controlled components — pages own the draft.

import { useState } from "react";
import {
  DAY_PASS_CHOICES,
  MAX_SITES,
  MAX_THEME_TERMS,
  WORK_PERMIT_CHOICES,
  normalizeDomain,
  type ParkConfig,
  type ThemePreset,
} from "@/lib/config";

const PRESET_GROUPS: { label: string; sites: string[] }[] = [
  {
    label: "Social feeds",
    sites: [
      "facebook.com",
      "instagram.com",
      "threads.net",
      "tiktok.com",
      "x.com",
      "reddit.com",
      "youtube.com",
      "linkedin.com",
      "strava.com",
      "snapchat.com",
      "pinterest.com",
      "twitch.tv",
    ],
  },
  {
    label: "News & rabbit holes",
    sites: [
      "news.google.com",
      "apnews.com",
      "cnn.com",
      "foxnews.com",
      "nytimes.com",
      "news.ycombinator.com",
      "espn.com",
      "bleacherreport.com",
    ],
  },
];

const PRESET_SITES = PRESET_GROUPS.flatMap((g) => g.sites);

export function SitesPicker({
  sites,
  onChange,
}: {
  sites: string[];
  onChange: (sites: string[]) => void;
}) {
  const [customDraft, setCustomDraft] = useState("");
  const [customError, setCustomError] = useState("");
  const extras = sites.filter((s) => !PRESET_SITES.includes(s));

  const toggle = (domain: string) => {
    onChange(
      sites.includes(domain)
        ? sites.filter((s) => s !== domain)
        : [...sites, domain].slice(0, MAX_SITES),
    );
  };

  const addCustom = () => {
    const domain = normalizeDomain(customDraft);
    if (!domain) {
      setCustomError("That doesn't look like a domain (try something.com)");
      return;
    }
    setCustomError("");
    setCustomDraft("");
    if (!sites.includes(domain)) onChange([...sites, domain].slice(0, MAX_SITES));
  };

  return (
    <section>
      <span className="field-label">Trail closures — sites the park replaces</span>
      {PRESET_GROUPS.map((group) => (
        <div key={group.label} className="mb-4">
          <span className="caps-label block mb-2">{group.label}</span>
          <div className="flex flex-wrap gap-2">
            {group.sites.map((domain) => (
              <button
                key={domain}
                type="button"
                className="chip"
                aria-pressed={sites.includes(domain)}
                onClick={() => toggle(domain)}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>
      ))}
      {extras.length > 0 && (
        <div className="mb-4">
          <span className="caps-label block mb-2">Your closures</span>
          <div className="flex flex-wrap gap-2">
            {extras.map((domain) => (
              <button
                key={domain}
                type="button"
                className="chip"
                aria-pressed={sites.includes(domain)}
                onClick={() => toggle(domain)}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="anything-distracting.com"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className="chip" onClick={addCustom}>
          + add
        </button>
      </div>
      {customError && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--rust)" }}>
          {customError}
        </p>
      )}
      {sites.length === 0 && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--rust)" }}>
          Pick at least one site — an empty park closes nothing.
        </p>
      )}
    </section>
  );
}

const THEME_OPTIONS: { preset: ThemePreset; title: string; blurb: string }[] = [
  { preset: "cats", title: "Cats", blurb: "resident mousers, no key needed" },
  { preset: "dogs", title: "Dogs", blurb: "the rangers' good boys" },
  { preset: "nature", title: "Nature", blurb: "rivers, ridgelines, golden hour" },
  { preset: "funny", title: "Funny", blurb: "fails, bloopers, wait-for-it" },
  { preset: "custom", title: "Custom", blurb: "your own search terms" },
];

export function ThemePicker({
  theme,
  onChange,
}: {
  theme: ParkConfig["theme"];
  onChange: (theme: ParkConfig["theme"]) => void;
}) {
  return (
    <section>
      <span className="field-label">Trail cam footage</span>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.preset}
            type="button"
            className="opt-card"
            aria-pressed={theme.preset === opt.preset}
            onClick={() =>
              onChange(
                opt.preset === "custom"
                  ? { preset: "custom", terms: theme.terms ?? [] }
                  : { preset: opt.preset },
              )
            }
          >
            <span className="block font-bold">{opt.title}</span>
            <span className="caps-label">{opt.blurb}</span>
          </button>
        ))}
      </div>
      {theme.preset === "custom" && (
        <input
          className="field"
          placeholder={`comma-separated, up to ${MAX_THEME_TERMS} — e.g. capybara, red panda`}
          value={(theme.terms ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              preset: "custom",
              terms: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, MAX_THEME_TERMS),
            })
          }
        />
      )}
    </section>
  );
}

export function PassRules({
  cfg,
  onChange,
}: {
  cfg: ParkConfig;
  onChange: (patch: Partial<ParkConfig>) => void;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <label className="field-label" htmlFor="dayPassMin">
          Day pass — minutes a game win unlocks one site
        </label>
        <div className="flex gap-2">
          {DAY_PASS_CHOICES.map((min) => (
            <button
              key={min}
              type="button"
              className="chip"
              aria-pressed={cfg.dayPassMin === min}
              onClick={() => onChange({ dayPassMin: min })}
            >
              {min} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="wpDomain">
          Work permit — one site you sometimes need for real work
        </label>
        <div className="flex gap-2">
          <select
            id="wpDomain"
            className="field"
            value={cfg.workPermit.domain}
            onChange={(e) =>
              onChange({ workPermit: { ...cfg.workPermit, domain: e.target.value } })
            }
          >
            {cfg.sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            aria-label="work permit minutes"
            className="field"
            style={{ maxWidth: 110 }}
            value={cfg.workPermit.min}
            onChange={(e) =>
              onChange({ workPermit: { ...cfg.workPermit, min: Number(e.target.value) } })
            }
          >
            {WORK_PERMIT_CHOICES.map((min) => (
              <option key={min} value={min}>
                {min} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="field-label">Ranger strictness</span>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="opt-card"
            aria-pressed={cfg.strict.dayPass}
            onClick={() => onChange({ strict: { ...cfg.strict, dayPass: !cfg.strict.dayPass } })}
          >
            <span className="block font-bold">Day pass: {cfg.strict.dayPass ? "strict" : "lenient"}</span>
            <span className="caps-label">
              {cfg.strict.dayPass
                ? "one loss restarts all three games"
                : "lose a game, retry that game"}
            </span>
          </button>
          <button
            type="button"
            className="opt-card"
            aria-pressed={cfg.strict.workPermit}
            onClick={() =>
              onChange({ strict: { ...cfg.strict, workPermit: !cfg.strict.workPermit } })
            }
          >
            <span className="block font-bold">
              Work permit: {cfg.strict.workPermit ? "flawless" : "lenient"}
            </span>
            <span className="caps-label">
              {cfg.strict.workPermit
                ? "longer pass, so a perfect run is required"
                : "lose a game, retry that game"}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
