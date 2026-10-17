import { useMemo } from "react";
import { Graph } from "./Graph";
import type { Selection } from "./learningTypes";
import type { Edge, SymbolInfo } from "./types";
export function CheckpointGraph({
  selection,
  onSymbol,
  onEdge,
  selectedEdge,
}: {
  selection: Selection;
  onSymbol: (id: string) => void;
  onEdge: (edge: Edge) => void;
  selectedEdge?: number;
}) {
  const { nodes, edges } = useMemo(() => {
    const edge = selection.edge;
    const nodes: SymbolInfo[] = [
      {
        id: selection.symbol_id,
        name: selection.name,
        kind: edge ? "function" : "definition",
      },
    ];
    if (edge?.target_id && edge.target_id !== selection.symbol_id)
      nodes.push({
        id: edge.target_id,
        name: edge.target_name!,
        kind: "function",
      });
    return { nodes, edges: edge ? [edge] : [] };
  }, [selection]);
  return (
    <aside className="checkpoint-graph" aria-label="Checkpoint compiler graph">
      <h2 tabIndex={-1}>Checkpoint graph</h2>
      <p>
        {selection.edge
          ? "Compiler-verified direct call. Select the arrow to return to its call site; open a function to explore further."
          : "Compiler-indexed definition. This checkpoint has no selected call relationship."}
      </p>
      <Graph
        nodes={nodes}
        edges={edges}
        active={selection.symbol_id}
        onSymbol={onSymbol}
        onEdge={onEdge}
        selectedEdge={selectedEdge}
      />
      <div className="checkpoint-graph-links">
        {selection.edge && (
          <button onClick={() => onEdge(selection.edge!)}>
            {selection.edge.source_name} → {selection.edge.target_name}
            <small>
              {selection.location.file}:{selection.location.line} · clang_ast ·
              successful
            </small>
          </button>
        )}
        {nodes.map((n) => (
          <button key={n.id} onClick={() => onSymbol(n.id)}>
            Open {n.name} in Explorer
          </button>
        ))}
      </div>
      <p className="small-copy">
        {selection.edge
          ? "This is one indexed relationship, not the complete execution path."
          : "A definition establishes a source location; it does not establish a runtime path."}
      </p>
    </aside>
  );
}
