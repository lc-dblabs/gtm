import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export interface Skill {
  name: string;
  description: string;
  content: string;
  source: string; // "owner/repo"
  path: string;
}

export interface SkillSource {
  owner: string;
  repo: string;
}

// In-memory cache with TTL
let skillCache: Skill[] = [];
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function parseFrontmatter(raw: string): { name: string; description: string; body: string } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) return { name: "", description: "", body: raw };

  const fm = fmMatch[1];
  const body = fmMatch[2];

  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    body,
  };
}

async function findSkillsInRepo(owner: string, repo: string): Promise<Skill[]> {
  const skills: Skill[] = [];

  try {
    // Use GitHub's Git Trees API to get all files recursively
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: "heads/main" }).catch(() =>
      octokit.git.getRef({ owner, repo, ref: "heads/master" })
    );
    const sha = ref.object.sha;

    const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: sha, recursive: "1" });

    // Find all SKILL.md files
    const skillFiles = tree.tree.filter((f) => f.path?.endsWith("SKILL.md") && f.type === "blob");

    for (const file of skillFiles) {
      if (!file.path) continue;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: file.path });
        if ("content" in data && typeof data.content === "string") {
          const raw = Buffer.from(data.content, "base64").toString("utf-8");
          const { name, description, body } = parseFrontmatter(raw);

          // Use path-based name fallback
          const fallbackName = file.path.split("/").slice(-2, -1)[0] ?? file.path;

          skills.push({
            name: name || fallbackName,
            description: description || `Skill from ${file.path}`,
            content: raw,
            source: `${owner}/${repo}`,
            path: file.path,
          });
        }
      } catch {
        // Skip files we can't read
      }
    }
  } catch (err) {
    console.warn(`Could not load skills from ${owner}/${repo}: ${err}`);
  }

  return skills;
}

async function listOrgRepos(org: string): Promise<string[]> {
  const repos: string[] = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.repos.listForOrg({ org, per_page: 100, page, type: "all" });
    repos.push(...data.map((r) => r.name));
    if (data.length < 100) break;
    page++;
  }
  return repos;
}

export async function resolveSkillSources(): Promise<SkillSource[]> {
  const sources: SkillSource[] = [];

  // SKILL_ORGS — scan all repos in these orgs (e.g. "DearbornLabs")
  const orgRaw = process.env.SKILL_ORGS ?? "";
  const orgs = orgRaw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const org of orgs) {
    try {
      const repos = await listOrgRepos(org);
      sources.push(...repos.map((repo) => ({ owner: org, repo })));
    } catch (err) {
      console.warn(`Could not list repos for org ${org}: ${err}`);
    }
  }

  // SKILL_SOURCES — specific repos (e.g. "DearbornLabs/dl-shared-kb")
  const repoRaw = process.env.SKILL_SOURCES ?? "";
  const specificRepos = repoRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [owner, repo] = s.split("/");
      return { owner, repo };
    })
    .filter((s) => s.owner && s.repo);
  for (const r of specificRepos) {
    if (!sources.find((s) => s.owner === r.owner && s.repo === r.repo)) {
      sources.push(r);
    }
  }

  // Always include the default repo if nothing else is configured
  if (sources.length === 0) {
    const defaultOwner = process.env.GITHUB_OWNER || "DearbornLabs";
    const defaultRepo = process.env.GITHUB_REPO || "dl-shared-kb";
    sources.push({ owner: defaultOwner, repo: defaultRepo });
  }

  return sources;
}

// Keep sync version for display (before resolution)
export function getSkillSources(): SkillSource[] {
  const orgRaw = process.env.SKILL_ORGS ?? "";
  const repoRaw = process.env.SKILL_SOURCES ?? "";
  const label: SkillSource[] = [];

  if (orgRaw) label.push(...orgRaw.split(",").map((o) => ({ owner: o.trim(), repo: "(all repos)" })));
  if (repoRaw) {
    repoRaw.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => {
      const [owner, repo] = s.split("/");
      if (owner && repo) label.push({ owner, repo });
    });
  }
  if (label.length === 0) label.push({ owner: process.env.GITHUB_OWNER || "DearbornLabs", repo: process.env.GITHUB_REPO || "dl-shared-kb" });

  return label;
}

export async function loadSkills(forceRefresh = false): Promise<Skill[]> {
  if (!forceRefresh && Date.now() < cacheExpiry && skillCache.length > 0) {
    return skillCache;
  }

  const sources = await resolveSkillSources();
  console.log(`Loading skills from: ${sources.map((s) => `${s.owner}/${s.repo}`).join(", ")}`);

  const allSkills: Skill[] = [];
  await Promise.all(
    sources.map(async ({ owner, repo }) => {
      const skills = await findSkillsInRepo(owner, repo);
      allSkills.push(...skills);
    })
  );

  skillCache = allSkills;
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  console.log(`Loaded ${skillCache.length} skills`);
  return skillCache;
}

export async function getSkill(nameOrPath: string): Promise<Skill | undefined> {
  const skills = await loadSkills();
  return skills.find(
    (s) => s.name.toLowerCase() === nameOrPath.toLowerCase() || s.path.includes(nameOrPath)
  );
}

export function formatSkillList(skills: Skill[]): string {
  if (skills.length === 0) return "_No skills found._";
  return skills
    .map((s) => `• *${s.name}* (${s.source})\n  ${s.description}`)
    .join("\n");
}
