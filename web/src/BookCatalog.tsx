import { useState } from "react";
import { Availability } from "./Availability";
import type { Topic } from "./learningTypes";
export function BookCatalog({
  chapters,
  glossary,
  investigations = [],
}: {
  chapters: Topic[];
  glossary: Record<string, string>;
  investigations?: Topic[];
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const related = query.trim()
    ? investigations.filter((t) =>
        `${t.title} ${t.apis?.join(" ")} ${t.synonyms?.join(" ")} ${t.terms.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
      )
    : [];
  const found = chapters.filter(
    (c) =>
      (!group || c.group === group) &&
      `${c.chapter} ${c.title} ${c.summary} ${c.orientation?.heading || ""} ${c.reading} ${c.explanation.join(" ")} ${c.apis?.join(" ")} ${c.synonyms?.join(" ")} ${c.terms.map((t) => t + " " + (glossary[t] || "")).join(" ")} ${c.concepts?.map((x) => x.title + " " + x.apis.join(" ")).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <section className="book-catalog" aria-label="Full book chapter guides">
      <h2>The whole book, at your pace</h2>
      <p>
        64 chapter reading guides, each with an original question, explanation
        and concept diagram. Focused investigations provide code walkthroughs
        and experiments; only reviewed mappings provide kernel checkpoints.
        Choose any chapter; there is no required sequence.
      </p>
      <div className="catalog-filters">
        <label>
          Find a chapter
          <input
            type="search"
            placeholder="Chapter number, title or idea…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Subject
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">All subjects</option>
            {[...new Set(chapters.map((c) => c.group))].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="catalog-count" aria-live="polite">
        {found.length} of {chapters.length} chapters
      </p>
      <div className="chapter-grid">
        {found.map((c) => (
          <a key={c.id} href={"#learn/" + c.id}>
            <span>
              Chapter {c.chapter} · {c.group}
            </span>
            <h3>{c.title}</h3>
            <p>{c.summary}</p>
            <Availability topic={c} />
          </a>
        ))}
      </div>
      {related.length > 0 && (
        <section className="catalog-investigations">
          <h3>Related investigations</h3>
          <p>
            Curated reading and code suggestions; these links are not
            compiler-resolved edges.
          </p>
          {related.map((t) => (
            <a key={t.id} href={"#learn/" + t.id}>
              {t.title}
              <Availability topic={t} />
            </a>
          ))}
        </section>
      )}
      {!found.length && (
        <p>No chapters match. Try another word or choose all subjects.</p>
      )}
    </section>
  );
}
