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
