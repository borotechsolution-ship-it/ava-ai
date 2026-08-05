import fs from "node:fs";
import path from "node:path";

const sourceDir = process.argv[2];
const outputFile = process.argv[3];

if (!sourceDir || !outputFile) {
  throw new Error("Usage: node scripts/generate-industry-skills.mjs <source-dir> <output-file>");
}

const skillConfigs = [
  {
    file: "Accounting_Tax_Firm_AI_Receptionist_Research_Pack.md",
    slug: "accounting_tax",
    displayName: "Accounting / Tax Firm",
    aliases: ["accounting", "tax", "tax firm", "cpa", "bookkeeping", "payroll", "irs notice", "accountant", "tax preparation"]
  },
  {
    file: "Aesthetic_Clinic_Medspa_AI_Receptionist_Research_Pack.md",
    slug: "medspa",
    displayName: "Aesthetic Clinic / Medspa",
    aliases: ["medspa", "med spa", "aesthetic clinic", "aesthetics", "cosmetic clinic", "botox", "filler", "laser clinic", "skin clinic"]
  },
  {
    file: "Chiropractor_AI_Receptionist_Research_Pack.md",
    slug: "chiropractor",
    displayName: "Chiropractor",
    aliases: ["chiropractor", "chiro", "spine clinic", "back pain clinic", "neck pain", "adjustment", "sports chiropractic"]
  },
  {
    file: "Gym_Fitness_Studio_AI_Receptionist_Research_Pack.md",
    slug: "gym_fitness",
    displayName: "Gym / Fitness Studio",
    aliases: ["gym", "fitness", "fitness studio", "personal training", "crossfit", "yoga studio", "pilates", "membership"]
  },
  {
    file: "Home_Cleaning_Firm_AI_Receptionist_Research_Pack.md",
    slug: "home_cleaning",
    displayName: "Home Cleaning Firm",
    aliases: ["home cleaning", "house cleaning", "maid service", "cleaners", "deep cleaning", "move out cleaning", "janitorial"]
  },
  {
    file: "HVAC_AI_Receptionist_Research_Pack.md",
    slug: "hvac",
    displayName: "HVAC",
    aliases: ["hvac", "heating", "cooling", "air conditioning", "ac repair", "furnace", "heat pump", "thermostat"]
  },
  {
    file: "Interior_Design_AI_Receptionist_Research_Pack.md",
    slug: "interior_design",
    displayName: "Interior Design",
    aliases: ["interior design", "interior designer", "home design", "decor", "remodel design", "space planning", "styling"]
  },
  {
    file: "Landscaping_Gardening_AI_Receptionist_Research_Pack.md",
    slug: "landscaping_gardening",
    displayName: "Landscaping / Gardening",
    aliases: ["landscaping", "gardening", "lawn care", "yard work", "garden maintenance", "hardscape", "irrigation"]
  },
  {
    file: "Law_Firm_AI_Receptionist_Research_Pack.md",
    slug: "law_firm",
    displayName: "Law Firm",
    aliases: ["law firm", "law office", "lawyer", "attorney", "legal", "solicitor", "advocate", "legal counsel"]
  },
  {
    file: "Moving_Company_Service_AI_Receptionist_Research_Pack.md",
    slug: "moving_company",
    displayName: "Moving Company",
    aliases: ["moving", "moving company", "movers", "relocation", "packing", "local move", "long distance move"]
  },
  {
    file: "Pest_Control_AI_Receptionist_Research_Pack.md",
    slug: "pest_control",
    displayName: "Pest Control",
    aliases: ["pest control", "exterminator", "bugs", "termites", "rodents", "bed bugs", "ants", "cockroaches"]
  },
  {
    file: "Pet_Sitting_Pet_Care_AI_Receptionist_Research_Pack.md",
    slug: "pet_care",
    displayName: "Pet Sitting / Pet Care",
    aliases: ["pet sitting", "pet care", "dog walking", "cat sitting", "pet boarding", "dog sitter", "pet sitter"]
  },
  {
    file: "Physiotherapy_AI_Receptionist_Research_Pack.md",
    slug: "physiotherapy",
    displayName: "Physiotherapy",
    aliases: ["physiotherapy", "physical therapy", "physio", "pt clinic", "rehab", "sports injury", "pain therapy"]
  },
  {
    file: "Plumbing_AI_Receptionist_Research_Pack.md",
    slug: "plumbing",
    displayName: "Plumbing",
    aliases: ["plumbing", "plumber", "leak", "drain cleaning", "water heater", "pipe repair", "clogged drain"]
  },
  {
    file: "Real_Estate_Agency_AI_Receptionist_Research_Pack.md",
    slug: "real_estate",
    displayName: "Real Estate Agency",
    aliases: ["real estate", "realtor", "estate agent", "property agent", "buy home", "sell home", "listing", "showing"]
  },
  {
    file: "Roofing_AI_Receptionist_Research_Pack.md",
    slug: "roofing",
    displayName: "Roofing",
    aliases: ["roofing", "roofer", "roof repair", "new roof", "roof leak", "storm damage", "hail damage", "roof inspection"]
  },
  {
    file: "Solar_AI_Receptionist_Research_Pack.md",
    slug: "solar",
    displayName: "Solar",
    aliases: ["solar", "solar panels", "solar installation", "battery storage", "solar quote", "solar company"]
  },
  {
    file: "Spa_Salon_AI_Receptionist_Research_Pack.md",
    slug: "salon_spa",
    displayName: "Spa / Salon",
    aliases: ["spa", "salon", "hair salon", "beauty salon", "facial", "massage", "nails", "barber"]
  },
  {
    file: "Travel_Agency_AI_Receptionist_Research_Pack.md",
    slug: "travel_agency",
    displayName: "Travel Agency",
    aliases: ["travel", "travel agency", "trip planner", "vacation", "tour", "cruise", "flight booking", "honeymoon"]
  },
  {
    file: "Veterinary_Clinic_AI_Receptionist_Research_Pack.md",
    slug: "veterinary",
    displayName: "Veterinary Clinic",
    aliases: ["veterinary", "vet", "veterinarian", "animal clinic", "pet clinic", "dog doctor", "cat doctor", "pet hospital"]
  }
];

function normalizeText(value) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\uFEFF/g, "")
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, "-")
    .replace(/â€“/g, "-")
    .replace(/â€¢/g, "-")
    .replace(/â†’/g, "->")
    .replace(/Â/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function sql(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonSql(value) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function extractSection(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  if (start < 0) return "";
  const rest = markdown.slice(start + startHeading.length);
  const end = rest.indexOf(endHeading);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function extractRagChunks(markdown, config) {
  const section = extractSection(markdown, "## 16. RAG Chunk Plan", "## 17.");
  const blocks = section.split(/\n### Chunk\s+\d+[^\n]*\n/g).slice(1);
  const chunks = [];

  for (const [index, block] of blocks.entries()) {
    const key = matchField(block, "chunk_key") || `${config.slug}_chunk_${String(index + 1).padStart(2, "0")}`;
    const title = matchField(block, "title") || `${config.displayName} Skill Chunk ${index + 1}`;
    const priority = Number(matchField(block, "priority")) || Math.min(10, index + 1);
    const metadata = matchField(block, "metadata") || "rag_chunk_plan";
    const contentMatch = block.match(/\*\*content:\*\*\s*([\s\S]*?)(?=\n### Chunk|\n## |\n\*\*chunk_key:|$)/i);
    const rawContent = contentMatch?.[1] || block;
    const content = compactContent(rawContent, priority <= 4 ? 1300 : 950);

    if (content.length > 120) {
      chunks.push({
        skill_slug: config.slug,
        chunk_key: cleanKey(key, config.slug, index),
        title: compactContent(title, 120),
        content,
        priority,
        metadata: {
          source_file: config.file,
          source_section: metadata,
          generated_from: "rag_chunk_plan"
        }
      });
    }
  }

  if (chunks.length >= 8) return chunks.slice(0, 18);
  return fallbackChunks(markdown, config);
}

function matchField(block, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("\\*\\*" + escaped + ":\\*\\*\\s*`?([^\\n`]+)`?", "i");
  return normalizeText(block.match(re)?.[1] || "");
}

function cleanKey(value, slug, index) {
  const key = normalizeText(value)
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || `${slug}_chunk_${String(index + 1).padStart(2, "0")}`;
}

function compactContent(value, maxChars) {
  const text = normalizeText(value)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\|/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).replace(/\s+\S*$/, "")}.`;
}

function fallbackChunks(markdown, config) {
  const sectionNames = [
    ["core_role", "## 1. Executive Summary", "## 2."],
    ["call_flow", "## 2. Ideal Call Flow", "## 3."],
    ["caller_intents", "## 3. Common Caller Intents", "## 4."],
    ["service_catalog", "## 4. Service Catalog", "## 5."],
    ["booking_rules", "## 5. Booking", "## 6."],
    ["calendar", "## 6. Dummy Calendar", "## 7."],
    ["pricing_rules", "## 7. Pricing", "## 8."],
    ["urgent_routing", "## 8. Urgent", "## 9."],
    ["objection_handling", "## 10. Objection", "## 11."],
    ["handoff_rules", "## 12. Human Handoff", "## 13."],
    ["voice_style", "## 13. Voice Style", "## 14."],
    ["scenario_scripts", "## 15. Common Scenario", "## 16."]
  ];

  return sectionNames.flatMap(([name, start, end], index) => {
    const content = compactContent(extractSection(markdown, start, end), index < 4 ? 1300 : 950);
    if (content.length < 120) return [];
    return [{
      skill_slug: config.slug,
      chunk_key: `${config.slug}_${name}`,
      title: `${config.displayName} ${name.replace(/_/g, " ")}`,
      content,
      priority: index < 4 ? index + 1 : Math.min(10, index + 2),
      metadata: {
        source_file: config.file,
        source_section: name,
        generated_from: "major_sections"
      }
    }];
  });
}

const skillRows = [];
const chunkRows = [];

for (const config of skillConfigs) {
  const filePath = path.join(sourceDir, config.file);
  const markdown = normalizeText(fs.readFileSync(filePath, "utf8"));
  const summary = compactContent(extractSection(markdown, "## 1. Executive Summary", "## 2."), 420);
  skillRows.push({
    slug: config.slug,
    display_name: config.displayName,
    aliases: config.aliases,
    status: "active",
    version: 1,
    summary: summary || `Premium AI receptionist skill for ${config.displayName}.`
  });

  chunkRows.push(...extractRagChunks(markdown, config));
}

const header = `-- Generated from local industry research packs.\n-- Source folder: ${sourceDir.replace(/\\/g, "/")}\n\n`;

const skillSql = `insert into industry_skills (slug, display_name, aliases, status, version, summary, updated_at)\nvalues\n${skillRows.map((row) => `(${sql(row.slug)}, ${sql(row.display_name)}, ${jsonSql(row.aliases)}, ${sql(row.status)}, ${row.version}, ${sql(row.summary)}, now())`).join(",\n")}\non conflict (slug) do update set\n  display_name = excluded.display_name,\n  aliases = excluded.aliases,\n  status = excluded.status,\n  version = excluded.version,\n  summary = excluded.summary,\n  updated_at = now();\n`;

const chunkSql = `\ninsert into industry_skill_chunks (skill_slug, chunk_key, title, content, priority, metadata)\nvalues\n${chunkRows.map((row) => `(${sql(row.skill_slug)}, ${sql(row.chunk_key)}, ${sql(row.title)}, ${sql(row.content)}, ${row.priority}, ${jsonSql(row.metadata)})`).join(",\n")}\non conflict (skill_slug, chunk_key) do update set\n  title = excluded.title,\n  content = excluded.content,\n  priority = excluded.priority,\n  metadata = excluded.metadata,\n  updated_at = now();\n`;

fs.writeFileSync(outputFile, header + skillSql + chunkSql, "utf8");
console.log(`Wrote ${skillRows.length} skills and ${chunkRows.length} chunks to ${outputFile}`);
