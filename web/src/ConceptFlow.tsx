import {useId, useState} from 'react';
import type {ConceptMap} from './learningTypes';

export function ConceptFlow({flow}: {flow: ConceptMap}) {
  const [selected, setSelected] = useState('');
  const marker = 'arrow-' + useId().replaceAll(':', '');
  // The vertical layout keeps full labels readable on a phone. Arcs also show branching
  // and shared resources without implying a fabricated compiler call chain.
  const height = flow.nodes.length * 92 + 16;
  const positions = new Map(flow.nodes.map((node, i) => [node.id, 54 + i * 92]));
  const names = new Map(flow.nodes.map(node => [node.id, node.label]));
  const related = flow.edges.filter(e => e.source === selected || e.target === selected);
  return <figure className="concept-flow">
    <figcaption><span className="annotation-label">Authored concept diagram</span><h3>{flow.title}</h3><p>A simplified view of the idea. Arrows show conceptual relationships, not compiler-verified calls. Select an annotated step for its explanation.</p>{flow.scope&&<p className="diagram-scope">{flow.scope}</p>}</figcaption>
    <div className="concept-drawing" style={{height}}>
      <svg viewBox={`0 0 360 ${height}`} preserveAspectRatio="none" aria-hidden="true"><defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>{flow.edges.map((edge,i) => {
        const y1=positions.get(edge.source)!; const y2=positions.get(edge.target)!;
        const adjacent=Math.abs(y2-y1) === 92 && y2>y1;
        return <path key={i} className={selected && (edge.source===selected || edge.target===selected) ? 'emphasized' : ''} d={adjacent ? `M 180 ${y1+28} L 180 ${y2-28}` : y1===y2?`M 300 ${y1-12} C 356 ${y1-65}, 356 ${y1+65}, 300 ${y1+12}`:`M 300 ${y1} C 356 ${y1}, 356 ${y2}, 300 ${y2}`} fill="none" markerEnd={`url(#${marker})`}/>;
      })}</svg>
      {flow.nodes.map(node => node.detail ? <button key={node.id} className={selected===node.id ? 'selected' : ''} style={{top:positions.get(node.id)!-28}} aria-pressed={selected===node.id} onClick={()=>setSelected(selected===node.id ? '' : node.id)}>{node.label}</button>:<div className="static-concept-node" key={node.id} style={{top:positions.get(node.id)!-28}}>{node.label}</div>)}
    </div>
    <div className="concept-connections" aria-live="polite">{selected ? <><strong>{names.get(selected)}</strong><p>{flow.nodes.find(n=>n.id===selected)?.detail}</p><ul>{related.map((e,i)=><li key={i}>{names.get(e.source)} → {names.get(e.target)}{e.label?` (${e.label})`:""}</li>)}</ul></> : <details><summary>Read diagram connections as text</summary><ul>{flow.edges.map((e,i)=><li key={i}>{names.get(e.source)} → {names.get(e.target)}{e.label?` (${e.label})`:""}</li>)}</ul></details>}</div>
  </figure>;
}
