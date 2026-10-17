import type { Curriculum } from "./learningTypes";
export function ExplorerWelcome({
  content,
  onFree,
}: {
  content?: Curriculum;
  onFree: () => void;
}) {
  return (
    <section
      className="explorer-welcome"
      aria-label="Explorer starting questions"
    >
      <header>
        <div>
          <h1 tabIndex={-1}>Start with a question from your C program</h1>
          <p>
            A short guided visit connects familiar code to one reviewed kernel
            responsibility.
          </p>
        </div>
        <button onClick={onFree}>Use free exploration</button>
      </header>
      <div className="guided-starts">
        {content?.lessons
          .filter((t) => t.explorer_start)
          .sort((a, b) =>
            a.id === "fork-memory" ? -1 : b.id === "fork-memory" ? 1 : 0,
          )
          .map((lesson) => {
            const start = lesson.explorer_start!;
            const checkpoint = lesson.checkpoints.find(
              (c) => c.id === start.checkpoint,
            );
            return (
              <article key={lesson.id}>
                <h2>{start.question}</h2>
                {start.purpose && <h3>{start.purpose}</h3>}
                <p>{start.introduction || start.situation}</p>
                <details>
                  <summary>
                    What this visit establishes and what to know first
                  </summary>
                  <p>{start.establishes}</p>
                  <p>
                    <strong>Before you go:</strong> {start.prerequisite}
                  </p>
                </details>
                <p className="start-availability">
                  {checkpoint?.available
                    ? "Reviewed source available in this index"
                    : checkpoint?.reason || "No reviewed mapping is available."}
                </p>
                <div className="explorer-actions">
                  {checkpoint?.available ? (
                    <a
                      className="primary-link"
                      href={"#explore?guide=" + lesson.id}
                    >
                      Start guided visit
                    </a>
                  ) : (
                    <span>Source visit unavailable</span>
                  )}
                  <a
                    href={`#learn/${lesson.id}?view=code&segment=${start.segment}`}
                  >
                    Read the C first
                  </a>
                </div>
              </article>
            );
          })}
      </div>
      {!content && <p role="status">Loading guided questions…</p>}
      <details className="layer-bridge">
        <summary>How does my C code connect to this kernel source?</summary>
        <ol>
          <li>
            Your C program calls an interface such as fork, execve or waitpid.
          </li>
          <li>
            A library wrapper implements that interface. Its code is not indexed
            here.
          </li>
          <li>
            The wrapper and architecture determine the syscall boundary. This
            index does not resolve the complete userspace-to-kernel path.
          </li>
          <li>
            These visits select reviewed kernel responsibilities that help
            explain your question.
          </li>
        </ol>
        <p>
          Curated links between these layers are authored teaching annotations.
          Graph arrows come from compiler evidence inside the indexed source;
          they do not connect your demo program to the kernel.
        </p>
      </details>
    </section>
  );
}
