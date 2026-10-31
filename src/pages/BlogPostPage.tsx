import { Link, Navigate, useParams } from "react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug } from "../lib/posts";

const MARKDOWN_COMPONENTS: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

function BlogPostPage() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <article className="animate-fade-up mx-auto max-w-3xl pt-16 pb-8">
      <Link
        to="/blog"
        className="font-mono text-sm text-neutral-500 transition-colors hover:text-emerald-400"
      >
        &larr; Back to blog
      </Link>
      <header className="mt-8 border-b border-white/5 pb-8">
        {post.venue && (
          <p className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 font-mono text-xs text-emerald-300">
            {post.venue}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 flex flex-wrap gap-x-3 font-mono text-xs text-neutral-500">
          <time dateTime={post.date}>{post.date}</time>
          <span>{post.readingMinutes} min read</span>
          {post.repoUrl && (
            <a
              href={post.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300"
            >
              {post.project} ↗
            </a>
          )}
        </p>
      </header>
      <div className="prose prose-invert prose-emerald mt-10 max-w-none prose-headings:tracking-tight prose-a:no-underline prose-a:hover:underline prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-pre:border prose-pre:border-white/5 prose-pre:bg-neutral-900 prose-table:text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={MARKDOWN_COMPONENTS}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}

export default BlogPostPage;
