export function PageHeader({
  tag,
  title,
  description,
  cmd,
}: {
  tag: string;
  title: string;
  description?: string;
  cmd?: string;
}) {
  return (
    <div className="container-x pt-12 pb-6 sm:pt-16">
      {cmd ? (
        <p className="font-mono text-sm">
          <span className="text-term-green">noe@portfolio</span>
          <span className="text-term-comment">:</span>
          <span className="text-term-blue">~</span>
          <span className="text-term-comment">$ </span>
          <span className="text-zinc-200">{cmd}</span>
        </p>
      ) : null}
      <p className="mt-3 section-tag">
        <span className="text-term-comment">// </span>
        <span className="text-accent">{tag}</span>
      </p>
      <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        <span className="bracket">{"<"}</span>
        {title}
        <span className="bracket">{" />"}</span>
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}
