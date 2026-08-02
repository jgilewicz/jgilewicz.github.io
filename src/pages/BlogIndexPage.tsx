import { Link } from "react-router";
import { getAllPosts } from "../lib/posts";

function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <section className="py-16">
      <h1 className="mb-8 text-2xl font-semibold text-neutral-50">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-neutral-500">No posts yet.</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="border-b border-neutral-800 pb-8 last:border-0 last:pb-0"
            >
              <Link to={`/blog/${post.slug}`} className="group">
                <h2 className="font-mono text-lg text-neutral-100 transition-colors group-hover:text-emerald-400">
                  {post.title}
                </h2>
              </Link>
              <p className="mt-1 text-sm text-neutral-500">{post.date}</p>
              <p className="mt-3 text-neutral-400">{post.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default BlogIndexPage;
