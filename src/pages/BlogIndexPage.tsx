import { Link } from "react-router";
import { getAllPosts } from "../lib/posts";

function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <section className="animate-fade-up pt-20 pb-8">
      <h1 className="text-4xl font-semibold tracking-tight text-neutral-50">
        Blog
      </h1>
      <p className="mt-3 text-neutral-400">
        Project write-ups: what I tried, what held up, what didn't.
      </p>
      {posts.length === 0 ? (
        <p className="mt-10 text-neutral-500">No posts yet.</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-white/5 bg-neutral-900/40 p-6 transition-colors hover:border-emerald-400/30 hover:bg-neutral-900/70"
              >
                <p className="flex flex-wrap gap-x-3 font-mono text-xs text-neutral-500">
                  <time dateTime={post.date}>{post.date}</time>
                  <span>{post.readingMinutes} min read</span>
                  {post.venue && (
                    <span className="text-emerald-400">{post.venue}</span>
                  )}
                </p>
                <h2 className="mt-3 text-xl font-medium text-neutral-100 transition-colors group-hover:text-emerald-300">
                  {post.title}
                </h2>
                <p className="mt-2 leading-relaxed text-neutral-400">
                  {post.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default BlogIndexPage;
