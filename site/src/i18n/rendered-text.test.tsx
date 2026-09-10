/**
 * The "no visible change" gate for #149.
 *
 * Moving every string out of the components is a refactor only if the pages
 * still say exactly what they said. Reading the diff cannot establish that —
 * 430-odd fragments moved, and a dropped `{" "}` or a swallowed em dash is
 * invisible in a review and obvious to a reader.
 *
 * So each surface is rendered and two things are snapshotted: the rendered
 * text, and every attribute value a person is read out or shown as a hint.
 * Between them they cover exactly what the literal guard covers. The snapshots
 * were recorded before the extraction started and are not to be regenerated as
 * part of it: if one moves, the page moved.
 *
 * `--update` is how a snapshot is re-recorded, and it belongs in a commit whose
 * subject is the wording change, never in a refactor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { SkillDetail } from "../components/SkillDetail";
import { SkillCard } from "../components/SkillCard";
import { DownloadBox } from "../components/DownloadBox";
import { History } from "../components/History";
import { Facet } from "../components/Facets";
import { TierBand, ContributeBand } from "../components/Bands";
import { SENSITIVITY_LABELS } from "../lib/labels";
import { EMPTY_FILTERS } from "../lib/types";
import { makeIndex, makeSkill } from "../test/fixtures";
import type { Skill, SkillDetail as Detail } from "../lib/types";

const REVIEWED = {
  date: "2026-08-30", expires: "2027-08-30",
  reviewers: ["AI Lab for Cities at Harvard"], notes: "",
};

/** Wide enough to reach the branches that carry their own prose: both tiers,
 *  a Lab namespace, a sensitivity badge, a deployment claim, and the two
 *  skills the About page links to when they are listed. */
const SKILLS: Skill[] = [
  makeSkill(),
  makeSkill({
    id: "civic-skills/other", name: "other", namespace: "civic-skills",
    tier: "reviewed", reviewed: REVIEWED, category: "policy", scope: "municipal",
    scope_secondary: "regional", category_secondary: "legal",
    localization: "localized", data_sensitivity: "protected", language: "es",
    provenance: {
      self_reported: true, affiliation: "government", deployment: "organization",
      deployed_at: "City of Boston", deployed_in: "US-MA / Boston",
      deployed_since: "2026-03",
    },
  }),
  makeSkill({ id: "civic-skills/generalize-skill", name: "generalize-skill",
    namespace: "civic-skills" }),
  makeSkill({ id: "civic-skills/localize-skill", name: "localize-skill",
    namespace: "civic-skills" }),
];

const INDEX = makeIndex(SKILLS);

const detail = (over: Partial<Detail> = {}): Detail => ({
  ...makeSkill(),
  files: [
    { path: "SKILL.md", size: 4096, executed: false },
    { path: "scripts/run.py", size: 2048, executed: true },
  ],
  archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
  ...over,
});

beforeEach(() => {
  // jsdom implements neither, and the About route calls both on arrival.
  Element.prototype.scrollIntoView ??= () => {};
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => INDEX }
      : { ok: false, status: 404, json: async () => ({}) }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

/** Attribute values a person reads: the accessible names, the tooltips and the
 *  input hints. Kept in document order so a moved one shows up as a move. */
const ATTRIBUTES = ["aria-label", "title", "alt", "placeholder"];

function spoken(root: HTMLElement): string[] {
  return [...root.querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(","))]
    .flatMap((el) => ATTRIBUTES
      .filter((a) => el.hasAttribute(a))
      .map((a) => `${a}=${el.getAttribute(a)}`));
}

function surface(root: HTMLElement) {
  return { text: root.textContent, spoken: spoken(root) };
}

/** The whole page, once the index has landed — the topper's counts, the bands
 *  and the footer only exist after it. */
async function page(hash: string) {
  window.location.hash = hash;
  const { container } = render(<App />);
  await waitFor(() => expect(screen.getByText(/Catalog generated/)).toBeInTheDocument());
  return surface(container);
}

describe("the pages say what they said", () => {
  it("browsing the catalog", async () => {
    expect(await page("#/")).toMatchSnapshot();
  });

  it("the about page", async () => {
    expect(await page("#/about")).toMatchSnapshot();
  });

  it("the about page with a section marked", async () => {
    expect(await page("#/about/review")).toMatchSnapshot();
  });

  it("the submit wizard, adding a skill", async () => {
    expect(await page("#/submit")).toMatchSnapshot();
  });

  it("the submit wizard, updating a listing", async () => {
    expect(await page("#/submit?mode=update&add=ns%2Fexample-skill")).toMatchSnapshot();
  });

  it("the catalog with a filter that matches nothing", async () => {
    window.location.hash = "#/";
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByText(/Catalog generated/)).toBeInTheDocument());
    const search = screen.getByLabelText("Search") as HTMLInputElement;
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(search, { target: { value: "nothing-matches-this" } });
    expect(surface(container)).toMatchSnapshot();
  });
});

describe("the skill detail page says what it said", () => {
  const served = (payload: Detail) =>
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(payload),
    }));

  it("a community listing with nothing filled in", async () => {
    served(detail());
    const { container } = render(<SkillDetail namespace="ns" name="example-skill" />);
    await screen.findByRole("region", { name: /what is in it/i });
    expect(surface(container)).toMatchSnapshot();
  });

  it("a reviewed listing with every optional field", async () => {
    served(detail({
      tier: "reviewed", reviewed: REVIEWED, namespace: "civic-skills",
      use_when: "Explaining a permit.", avoid_when: "Deciding an appeal.",
      jurisdiction: "US-MA / Boston", localization: "localized",
      languages_tested: ["en", "es"], verified_languages: ["en"],
      data_sensitivity: "protected", human_review: "decision-support",
      compatibility: ">=1.0", version: "2.1.3",
      category_secondary: "legal", scope: "municipal", scope_secondary: "regional",
      source: { repo: "someone/skills", commit: "b".repeat(40) },
      history: { first_seen: "2026-01-15T00:00:00Z", last_changed: "2026-06-01T00:00:00Z",
                 commits: 4, pull_request: 42 },
      provenance: {
        self_reported: true, affiliation: "government", deployment: "organization",
        deployed_at: "City of Boston", deployed_in: "US-MA / Boston",
        deployed_since: "2026-03",
      },
    }));
    const { container } = render(<SkillDetail namespace="civic-skills" name="example-skill" />);
    await screen.findByRole("region", { name: /what is in it/i });
    expect(surface(container)).toMatchSnapshot();
  });

  it("a skill that is not listed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { container } = render(<SkillDetail namespace="ns" name="missing" />);
    await screen.findByText(/is listed here/);
    expect(surface(container)).toMatchSnapshot();
  });
});

describe("the pieces say what they said", () => {
  it("a card", () => {
    const { container } = render(<SkillCard skill={SKILLS[1]!} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("the tier band", () => {
    const { container } = render(<TierBand counts={INDEX.counts} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("the tier band when every listing is Community", () => {
    const { container } = render(
      <TierBand counts={{ total: 4, reviewed: 0, community: 4 }} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("the contribute band", () => {
    const { container } = render(<ContributeBand repo="https://example.test/repo" />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("the download box for a community listing", () => {
    const { container } = render(<DownloadBox skill={detail()} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("the download box for a listing the Lab wrote and reviewed", () => {
    const { container } = render(<DownloadBox skill={detail({
      tier: "reviewed", reviewed: REVIEWED, namespace: "civic-skills",
    })} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("the download box for a listing somebody else wrote", () => {
    const { container } = render(<DownloadBox skill={detail({
      tier: "reviewed", reviewed: REVIEWED,
    })} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("version and history", () => {
    const { container } = render(<History version="2.1.3" history={{
      first_seen: "2026-01-15T00:00:00Z", last_changed: "2026-06-01T00:00:00Z",
      commits: 4, pull_request: 42,
    }} />);
    expect(surface(container)).toMatchSnapshot();
  });

  it("a facet with a note", () => {
    const { container } = render(
      <Facet legend="Data touched" field="data_sensitivity" filterKey="dataSensitivity"
        labels={SENSITIVITY_LABELS} skills={SKILLS} filters={EMPTY_FILTERS}
        onChange={() => {}} note="What the skill touches when it runs." />);
    expect(surface(container)).toMatchSnapshot();
  });
});
