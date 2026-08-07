import { Link, Navigate, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug } from "../lib/posts";

function BlogPostPage() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <article className="py-16">
      <Link
        to="/blog"
        className="text-sm text-neutral-500 transition-colors hover:text-emerald-400"
      >
        &larr; Back to blog
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-neutral-50 sm:text-3xl">
        {post.title}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{post.date}</p>
      <div className="prose prose-invert prose-emerald mt-8 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}

export default BlogPostPage;
