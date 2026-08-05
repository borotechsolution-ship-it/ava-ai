"use client";

import { useMemo, useState } from "react";
import type { IndustrySkillOption } from "@/lib/industry-skills";

type IndustrySkillAutocompleteProps = {
  skills: IndustrySkillOption[];
};

export function IndustrySkillAutocomplete({ skills }: IndustrySkillAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const normalizedQuery = normalize(query);
  const selectedSkill = skills.find((skill) => skill.slug === selectedSlug);

  const matches = useMemo(() => {
    if (normalizedQuery.length < 2) return [];

    return skills
      .map((skill) => ({ skill, score: matchScore(skill, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.skill.displayName.localeCompare(b.skill.displayName))
      .slice(0, 6)
      .map((item) => item.skill);
  }, [normalizedQuery, skills]);

  const showPanel = isFocused && normalizedQuery.length >= 2;

  function selectSkill(skill: IndustrySkillOption) {
    setQuery(skill.displayName);
    setSelectedSlug(skill.slug);
    setIsFocused(false);
  }

  return (
    <label>
      Industry
      <input type="hidden" name="skillSlug" value={selectedSlug} />
      <div className="industry-autocomplete">
        <input
          name="industry"
          value={query}
          placeholder="Type 2 letters, e.g. roofer"
          required
          autoComplete="off"
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            if (!matchesExactSkill(nextValue, selectedSkill)) setSelectedSlug("");
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 120);
          }}
        />
        {selectedSkill ? <span className="skill-pill">Skill: {selectedSkill.displayName}</span> : null}
        {showPanel ? (
          <div className="industry-suggestions">
            {matches.length ? (
              matches.map((skill) => (
                <button key={skill.slug} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSkill(skill)}>
                  <strong>{skill.displayName}</strong>
                  <span>{skill.aliases.slice(0, 4).join(" / ")}</span>
                </button>
              ))
            ) : (
              <div className="industry-fallback-note">
                <strong>No saved skill found</strong>
                <span>Ava will use Gemini fallback and cache the company context.</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function matchScore(skill: IndustrySkillOption, query: string) {
  const names = [skill.displayName, skill.slug, ...skill.aliases].map(normalize);
  if (names.some((name) => name === query)) return 100;
  if (names.some((name) => name.startsWith(query))) return 70;
  if (names.some((name) => name.includes(query))) return 40;
  return 0;
}

function matchesExactSkill(value: string, skill: IndustrySkillOption | undefined) {
  if (!skill) return false;
  const normalizedValue = normalize(value);
  return [skill.displayName, skill.slug, ...skill.aliases].some((item) => normalize(item) === normalizedValue);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
