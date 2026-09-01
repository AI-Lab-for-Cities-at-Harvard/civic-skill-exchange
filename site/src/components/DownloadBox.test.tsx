/** The archive exists for someone with a browser and nothing else. These tests
 *  pin the two things that makes true: the link is a real download, and the
 *  tier disclaimer from #4 still sits beside it. */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DownloadBox } from "./DownloadBox";
import { makeSkill } from "../test/fixtures";
import type { SkillDetail } from "../lib/types";

function detail(over: Partial<SkillDetail> = {}): SkillDetail {
  return {
    ...makeSkill(),
    files: [{ path: "SKILL.md", size: 4096, executed: false }],
    archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
    ...over,
  };
}

describe("DownloadBox — the no-tooling path", () => {
  it("offers the archive as a real download, not a command", () => {
    render(<DownloadBox skill={detail()} />);
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", "/data/skills/ns/example-skill.zip");
    expect(link).toHaveAttribute("download");
  });

  it("states the size before somebody starts the download", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByTestId("download-archive")).toHaveTextContent("5.6 KB");
  });

  it("says what to do with the file, for someone not working in git", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByTestId("download-archive")).toHaveTextContent(/upload/i);
  });

  it("keeps the command-line paths for people who want them", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByText(/npx degit/)).toBeInTheDocument();
    expect(screen.getByText(/git clone/)).toBeInTheDocument();
  });

  it("still carries the Community disclaimer beside the button", () => {
    render(<DownloadBox skill={detail({ tier: "community" })} />);
    expect(screen.getByText(/nobody has reviewed this skill/i)).toBeInTheDocument();
  });

  it("degrades without an archive rather than rendering a broken link", () => {
    const without = detail();
    delete (without as Partial<SkillDetail>).archive;
    render(<DownloadBox skill={without} />);
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/npx degit/)).toBeInTheDocument();
  });
});

/** ADR 0001, ruling 2: the Lab may review its own skills, with disclosure.
 *
 *  The marker is derived, not declared — `civic-skills` is already a reserved
 *  namespace in the validator, so nobody has to remember to set a field. The
 *  disclosure belongs on the review claim itself, which is the sentence that
 *  would otherwise have the Lab vouching for the Lab without saying so. */
describe("DownloadBox discloses self-review", () => {
  const attested = {
    date: "2026-08-30", expires: "2027-08-30",
    reviewers: ["AI Lab for Cities at Harvard"], notes: "",
  };

  it("says so when the Lab reviewed a skill the Lab wrote", () => {
    render(<DownloadBox skill={detail({
      tier: "reviewed", namespace: "civic-skills", reviewed: attested,
    })} />);
    expect(screen.getByText(/by its own author/i)).toBeInTheDocument();
    expect(screen.getByText(/wrote and reviewed this skill/i)).toBeInTheDocument();
  });

  it("stays silent on a Reviewed skill somebody else wrote", () => {
    render(<DownloadBox skill={detail({ tier: "reviewed", reviewed: attested })} />);
    expect(screen.queryByText(/by its own author/i)).not.toBeInTheDocument();
    expect(screen.getByText(/read this exact commit/)).toBeInTheDocument();
  });

  it("still names the attesting party rather than a count", () => {
    render(<DownloadBox skill={detail({ tier: "reviewed", reviewed: attested })} />);
    expect(screen.getByText(/AI Lab for Cities at Harvard read this exact commit/))
      .toBeInTheDocument();
    expect(screen.queryByText(/two reviewers/i)).not.toBeInTheDocument();
  });
});

/** The card no longer warns on a Lab-authored Community listing (#51, owner's
 *  ruling). This is where that warning has to survive, because it is now the
 *  only place a reader meets it — and it is the moment they are about to run
 *  the thing. */
describe("DownloadBox still warns about an unreviewed Lab skill", () => {
  it("says nobody has reviewed it, exactly as for anyone else's", () => {
    render(<DownloadBox skill={detail({
      namespace: "civic-skills", tier: "community",
    })} />);
    expect(screen.getByText(/Nobody has reviewed this skill/)).toBeInTheDocument();
    expect(screen.getByText(/Read the source on GitHub before you/))
      .toBeInTheDocument();
  });
});

/** #73: the registry is a Claude Code plugin marketplace, so a skill is two
 *  commands rather than a download. The plugin name carries the namespace
 *  because plugin names are unique across a marketplace and two people may
 *  publish the same skill name. */
describe("DownloadBox — installing as a plugin", () => {
  it("offers the marketplace commands", () => {
    render(<DownloadBox skill={detail({ namespace: "cityofx", name: "permit-status" })} />);
    expect(screen.getByText(/\/plugin marketplace add AI-Lab-for-Cities-at-Harvard\/civic-skill-exchange/))
      .toBeInTheDocument();
    expect(screen.getByText("/plugin install cityofx-permit-status@civic-skill-exchange"))
      .toBeInTheDocument();
  });

  it("puts the plugin path first, because it is the one that needs no tooling knowledge", () => {
    render(<DownloadBox skill={detail({ namespace: "cityofx", name: "permit-status" })} />);
    const labels = screen.getAllByText(/Just this skill|The whole registry|Add the marketplace|Install it/);
    expect(labels[0]).toHaveTextContent(/Add the marketplace/);
  });
});
