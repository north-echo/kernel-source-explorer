import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { Edge, SymbolInfo } from "./types";

const PAGE_SIZE = 8;
export function Graph({
  nodes,
  edges,
  active,
  onSymbol,
  onEdge,
  selectedEdge,
}: {
  nodes: SymbolInfo[];
  edges: Edge[];
  active: string;
  onSymbol: (id: string) => void;
  onEdge: (e: Edge) => void;
  selectedEdge?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const instance = useRef<cytoscape.Core | null>(null);
  const [page, setPage] = useState(0);
  const [candidates, setCandidates] = useState<Edge[]>([]);
  useEffect(() => {
    setPage(0);
    setCandidates([]);
  }, [active]);
  const names = new Map(nodes.map((n) => [n.id, n.name]));
  const neighbors = [
    ...new Set(
      edges
        .flatMap((e) => [e.source_id, e.target_id || "unresolved-" + e.id])
        .filter((id) => id !== active),
    ),
  ];
  const pageCount = Math.max(1, Math.ceil(neighbors.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = neighbors.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  useEffect(() => {
    if (!root.current) return;
    const allowed = new Set([active, ...visible]);
    // Aggregate only the same source, target and relationship kind. Each graph edge opens
    // one actual evidence record; all call sites remain individually available in the list.
    const groups = new Map<string, Edge[]>();
    for (const e of edges) {
      const target = e.target_id || "unresolved-" + e.id;
      if (!allowed.has(e.source_id) || !allowed.has(target)) continue;
      const key = JSON.stringify([e.source_id, target, e.kind]);
      groups.set(key, [...(groups.get(key) || []), e]);
    }
    const positions = [
      [-175, -95],
      [0, -95],
      [175, -95],
      [-175, 0],
      [175, 0],
      [-175, 95],
      [0, 95],
      [175, 95],
    ];
    const label = (id: string) => {
      const name =
        names.get(id) ||
        (id.startsWith("unresolved-") ? "Unresolved callback" : id);
      return name.length > 23 ? name.slice(0, 21) + "…" : name;
    };
    const cy = cytoscape({
      container: root.current,
      elements: [
        {
          data: { id: active, label: label(active), center: "yes" },
          position: { x: 220, y: 150 },
        },
        ...visible.map((id, i) => ({
          data: { id, label: label(id), center: "no" },
          position: { x: 220 + positions[i][0], y: 150 + positions[i][1] },
        })),
        ...[...groups.values()].map((group) => {
          const e = group[0];
          return {
            data: {
              id: "edge-" + e.id,
              source: e.source_id,
              target: e.target_id || "unresolved-" + e.id,
              label:
                e.kind.replaceAll("_", " ") +
                (group.length > 1 ? " ×" + group.length : ""),
              kind: e.kind,
              chosen: group.some((e) => e.id === selectedEdge) ? "yes" : "no",
            },
          };
        }),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#e4eaf0",
            "border-color": "#708296",
            "border-width": 1,
            label: "data(label)",
            color: "#24364b",
            "font-family": "monospace",
            "font-size": 12,
            "text-valign": "center",
            shape: "round-rectangle",
            width: 155,
            height: 38,
          },
        },
        {
          selector: 'node[center="yes"]',
          style: {
            "background-color": "#215d91",
            color: "#fff",
            "border-color": "#16456d",
            "border-width": 2,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#8397aa",
            "target-arrow-color": "#8397aa",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 10,
            color: "#334b62",
            "text-background-color": "#f6f8fa",
            "text-background-opacity": 1,
            "text-background-padding": "2px",
          },
        },
        {
          selector: 'edge[kind="indirect_call"]',
          style: {
            "line-style": "dashed",
            "line-color": "#a16a12",
            "target-arrow-color": "#a16a12",
          },
        },
        {
          selector: 'edge[chosen="yes"]',
          style: {
            width: 3,
            "line-color": "#ad6810",
            "target-arrow-color": "#ad6810",
          },
        },
        {
          selector: ":selected",
          style: {
            "border-color": "#ad6810",
            "line-color": "#ad6810",
            "target-arrow-color": "#ad6810",
          },
        },
      ],
      layout: { name: "preset", padding: 24 },
      minZoom: 0.25,
      maxZoom: 2,
    });
    instance.current = cy;
    cy.on("tap", "node", (event) => {
      const id = event.target.id();
      if (!id.startsWith("unresolved-")) onSymbol(id);
    });
    cy.on("tap", "edge", (event) => {
      const group = [...groups.values()].find(
        (g) => "edge-" + g[0].id === event.target.id(),
      );
      if (group) {
        if (group.length === 1) onEdge(group[0]);
        else setCandidates(group);
      }
    });
    cy.on("mouseover", "node", (event) => {
      if (root.current)
        root.current.title =
          names.get(event.target.id()) || "Unresolved callback";
    });
    const observer = new ResizeObserver(() => {
      cy.resize();
      cy.fit(undefined, 24);
    });
    observer.observe(root.current);
    return () => {
      observer.disconnect();
      instance.current = null;
      cy.destroy();
    };
    // Visible membership is derived from these inputs; page changes deliberately reframe the graph.
  }, [nodes, edges, active, currentPage, onSymbol, onEdge, selectedEdge]);
  const allGroups = [
    ...new Map(
      edges.map((e) => [
        JSON.stringify([
          e.source_id,
          e.target_id || "unresolved-" + e.id,
          e.kind,
        ]),
        [] as Edge[],
      ]),
    ).keys(),
  ].map((key) =>
    edges.filter(
      (e) =>
        JSON.stringify([
          e.source_id,
          e.target_id || "unresolved-" + e.id,
          e.kind,
        ]) === key,
    ),
  );
  return (
    <>
      <div
        className="graph-canvas"
        ref={root}
        role="img"
        aria-label="Symbol relationship graph. Equivalent keyboard navigation is available in the evidence list below."
      />
      <div className="graph-pager">
        <span>
          {visible.length} of {neighbors.length} unique loaded neighbors · ×
          counts evidence
        </span>
        <button
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
          aria-label="Previous graph page"
        >
          ←
        </button>
        <button
          disabled={currentPage + 1 >= pageCount}
          onClick={() => setPage(currentPage + 1)}
          aria-label="Next graph page"
        >
          →
        </button>
        <button
          onClick={() =>
            instance.current?.zoom({
              level: Math.min(2, instance.current.zoom() * 1.25),
              renderedPosition: {
                x: root.current!.clientWidth / 2,
                y: root.current!.clientHeight / 2,
              },
            })
          }
          aria-label="Zoom graph in"
        >
          +
        </button>
        <button onClick={() => instance.current?.fit(undefined, 24)}>
          Fit
        </button>
      </div>
      <details className="graph-symbol-names">
        <summary>Neighbor names and grouped evidence</summary>
        <p>
          Full symbol names; each group contains individual call sites or
          translation-unit records.
        </p>
        {[...new Set([active, ...neighbors])]
          .filter((id) => !id.startsWith("unresolved-"))
          .map((id) => (
            <button key={id} onClick={() => onSymbol(id)}>
              {names.get(id) || id}
            </button>
          ))}
        {allGroups.map((group) => (
          <button key={group[0].id} onClick={() => setCandidates(group)}>
            {group[0].source_name} →{" "}
            {group[0].target_name || "unresolved target"} · {group.length}{" "}
            evidence records
          </button>
        ))}
      </details>
      {candidates.length > 0 && (
        <section
          className="graph-evidence-chooser"
          aria-label="Choose relationship evidence"
        >
          <h3>Choose a compiler evidence location</h3>
          {candidates.map((e) => (
            <button
              key={e.id}
              aria-pressed={selectedEdge === e.id}
              onClick={() => onEdge(e)}
            >
              {e.source_name} → {e.target_name || "unresolved target"}
              <small>
                {e.file}:{e.line}:{e.column} · TU {e.tu} · {e.status} ·{" "}
                {e.origin}
              </small>
            </button>
          ))}
          <button onClick={() => setCandidates([])}>
            Close evidence chooser
          </button>
        </section>
      )}
    </>
  );
}
