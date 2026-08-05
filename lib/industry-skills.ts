import { supabaseAdmin } from "@/lib/supabase";

export type IndustrySkillOption = {
  slug: string;
  displayName: string;
  aliases: string[];
  summary: string;
};

type IndustrySkillRow = {
  slug: string;
  display_name: string;
  aliases: unknown;
  summary: string | null;
};

export async function listIndustrySkillOptions(): Promise<IndustrySkillOption[]> {
  const { data, error } = await supabaseAdmin()
    .from("industry_skills")
    .select("slug,display_name,aliases,summary")
    .eq("status", "active")
    .order("display_name", { ascending: true });

  if (error) {
    console.error("Could not load industry skills", {
      code: error.code,
      message: error.message
    });
    return [];
  }

  return ((data || []) as IndustrySkillRow[]).map(mapIndustrySkillRow);
}

export async function getIndustrySkillOption(slug?: string | null): Promise<IndustrySkillOption | null> {
  const cleanSlug = typeof slug === "string" ? slug.trim() : "";
  if (!cleanSlug) return null;

  const { data, error } = await supabaseAdmin()
    .from("industry_skills")
    .select("slug,display_name,aliases,summary")
    .eq("slug", cleanSlug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return mapIndustrySkillRow(data as IndustrySkillRow);
}

function mapIndustrySkillRow(row: IndustrySkillRow): IndustrySkillOption {
  return {
    slug: row.slug,
    displayName: row.display_name,
    aliases: stringArray(row.aliases),
    summary: row.summary || ""
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
