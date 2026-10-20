import type { Plugin, Skill } from "../lib/types";

type Level = 2 | 3 | 4;

export function SkillRow(_: { skill: Skill; level: Level }) {
  return null;
}

export function PluginRow(_: { plugin: Plugin; level: Level }) {
  return null;
}
