import { GITHUB_URL } from "../data/profile";

export interface Post {
  title: string;
  date: string;
  slug: string;
  excerpt: string;
  project?: string;
  repoUrl?: string;
  venue?: string;
  readingMinutes: number;
  content: string;
}

const WORDS_PER_MINUTE = 220;

// `project` is a repo name under GITHUB_URL, or `owner/repo` for repos elsewhere
function repoUrlFor(project: string | undefined): string | undefined {
  if (!project) return undefined;
  return project.includes("/")
    ? `https://github.com/${project}`
    : `${GITHUB_URL}/${project}`;
}

function parsePost(raw: string): Post {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(
      "post is missing frontmatter delimited by '---' lines — see " +
        "src/content/posts/distil-act.md for the expected format",
    );
  }
  const [, frontmatterBlock, content] = match;
  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterBlock.split("\n")) {
    if (!line.trim()) continue;
    const separatorIndex = line.indexOf(":");
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    frontmatter[key] = value;
  }
  for (const field of ["title", "date", "slug", "excerpt"]) {
    if (!frontmatter[field]) {
      throw new Error(`post frontmatter is missing required field "${field}"`);
    }
  }
  const body = content.trim();
  return {
    title: frontmatter.title,
    date: frontmatter.date,
    slug: frontmatter.slug,
    excerpt: frontmatter.excerpt,
    project: frontmatter.project,
    repoUrl: repoUrlFor(frontmatter.project),
    venue: frontmatter.venue,
    readingMinutes: Math.max(
      1,
      Math.round(body.split(/\s+/).length / WORDS_PER_MINUTE),
    ),
    content: body,
  };
}

const rawPosts = import.meta.glob("/src/content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const posts: Post[] = Object.values(rawPosts)
  .map(parsePost)
  .sort((a, b) => b.date.localeCompare(a.date));

export function getAllPosts(): Post[] {
  return posts;
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}
