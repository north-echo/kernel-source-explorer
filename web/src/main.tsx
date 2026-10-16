import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import hljs from 'highlight.js/lib/core';
import c from 'highlight.js/lib/languages/c';
import {Graph} from './Graph';
import {CheckpointGraph} from './CheckpointGraph';
import {api} from './api';
import {Learning} from './Learning';
import {useReaderState} from './useReaderState';
import {emptyNotes} from './learningTypes';
import type {GuidedContext} from './learningTypes';
import type {Dataset, Edge, Hit, Loc, Location, Neighborhood, Source, Step, SymbolInfo, Trail} from './types';
import './style.css';
hljs.registerLanguage('c', c);

function App() {
  const {reader, updateReader, storageError} = useReaderState();
  const [mode, setMode] = useState(window.location.hash.startsWith('#explore') ? 'explore' : 'learn');
  const [guided, setGuided] = useState<GuidedContext>();
  const [fullExplorer, setFullExplorer] = useState(false);
  const [showCheckpointGraph, setShowCheckpointGraph] = useState(true);
  useEffect(() => {const changed = () => setMode(window.location.hash.startsWith('#explore') ? 'explore' : 'learn'); window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed);}, []);
  const [dataset, setDataset] = useState<Dataset>();
  const [error, setError] = useState('');
  const [indexError, setIndexError] = useState('');
  const [query, setQuery] = useState('');
  const [path, setPath] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchMore, setSearchMore] = useState(false);
  const [active, setActive] = useState('');
  const [selected, setSelected] = useState<SymbolInfo>();
  const [locations, setLocations] = useState<Location[]>([]);
  const [nodes, setNodes] = useState<SymbolInfo[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [edge, setEdge] = useState<Edge>();
  const [focus, setFocus] = useState<Loc>();
  const [source, setSource] = useState<Source>();
  const [direction, setDirection] = useState('both');
  const [kind, setKind] = useState('all');
  const [next, setNext] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [steps, setSteps] = useState<Step[]>([]);
  const [note, setNote] = useState('');
  const [trailName, setTrailName] = useState('');
  const [trails, setTrails] = useState<Trail[]>([]);
  const viewGeneration = useRef(0);
  const importRef = useRef<HTMLInputElement>(null);
  const pendingLocation = useRef<{id: string; location: Loc; edge?: Edge} | undefined>(undefined);
  const ds = dataset?.metadata.dataset_id;
  useEffect(() => {api<Dataset>('dataset').then(setDataset).catch(e => setIndexError(e.message));}, []);
  useEffect(() => {
    if (!ds) return;
    try {setTrails(JSON.parse(localStorage.getItem('kse-trails-' + ds) || '[]'));} catch {setError('Saved trails could not be read.');}
  }, [ds]);
  useEffect(() => {setSearchOffset(0); setHits([]);}, [query, path]);
  useEffect(() => {
    if (!ds) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<Hit[]>('symbols?' + new URLSearchParams({q: query, path, offset: String(searchOffset)}), ds, controller.signal)
        .then(results => {setHits(old => searchOffset ? [...old, ...results] : results); setSearchMore(results.length === 40);})
        .catch(e => {if (e.name !== 'AbortError') setError(e.message);});
    }, 120);
    return () => {clearTimeout(timer); controller.abort();};
  }, [query, path, ds, searchOffset]);
  const choose = useCallback((id: string) => {
    setActive(id); setEdge(undefined); setError('');
    setHistory(old => {const next = [...old.slice(0, historyIndex + 1), id]; setHistoryIndex(next.length - 1); return next;});
  }, [historyIndex]);
  const inspectEdge = useCallback((e: Edge) => {setEdge(e); setFocus(e); setError('');}, []);
  useEffect(() => {
    if (!active || !ds) return;
    const controller = new AbortController();
    setSource(undefined); setFocus(undefined); setLocations([]); setSelected(undefined); setEdge(undefined);
    api<{symbol: SymbolInfo; locations: Location[]}>('symbol?' + new URLSearchParams({id: active}), ds, controller.signal)
      .then(detail => {const pending = pendingLocation.current?.id === active ? pendingLocation.current : undefined; setSelected(detail.symbol); setLocations(detail.locations); setFocus(pending?.location || detail.locations[0]); setEdge(pending?.edge); pendingLocation.current = undefined;})
      .catch(e => {if (e.name !== 'AbortError') setError(e.message);});
    return () => controller.abort();
  }, [active, ds]);
  useEffect(() => {
    viewGeneration.current += 1;
    if (!active || !ds) return;
    const controller = new AbortController();
    setNodes([]); setEdges([]); setNext(null); setTotal(0);
    api<Neighborhood>('neighborhood?' + new URLSearchParams({id: active, direction, kind}), ds, controller.signal)
      .then(result => {setNodes(result.nodes); setEdges(result.edges); setNext(result.next_offset); setTotal(result.total);})
      .catch(e => {if (e.name !== 'AbortError') setError(e.message);});
    return () => controller.abort();
  }, [active, ds, direction, kind]);
  useEffect(() => {
    if (!focus || !ds) return;
    const controller = new AbortController(); setSource(undefined);
    api<Source>('source?' + new URLSearchParams({file: focus.file, line: String(focus.line), before: guided && !fullExplorer ? '4' : '12', after: guided && !fullExplorer ? '12' : '30'}), ds, controller.signal)
      .then(setSource).catch(e => {if (e.name !== 'AbortError') setError(e.message);});
    return () => controller.abort();
  }, [focus, ds, guided, fullExplorer]);
  useEffect(() => {if (mode === 'explore') document.querySelector('.source-line.current')?.scrollIntoView({block: 'nearest'});}, [source, mode]);
  useEffect(() => {
    if (!guided || !ds || !source || !guided.checkpoint.selection) return;
    const location = guided.checkpoint.selection.location;
    if (source.file !== location.file || source.line !== location.line || reader.notes[guided.lesson.id]?.visited[guided.checkpoint.id] === ds) return;
    updateReader(old => {const notes = old.notes[guided.lesson.id] || emptyNotes(); return {...old, notes: {...old.notes, [guided.lesson.id]: {...notes, visited: {...notes.visited, [guided.checkpoint.id]: ds}}}};});
  }, [source, guided, ds, reader.notes, updateReader]);
  function openCheckpoint(context: GuidedContext) {
    const selection = context.checkpoint.selection;
    if (!selection || context.checkpoint.dataset_id !== ds) {setError('The checkpoint belongs to another dataset. Reload the reading companion.'); return;}
    setGuided(context); setFullExplorer(false); setShowCheckpointGraph(true); setDirection('outgoing'); setKind('direct_call');
    if (active === selection.symbol_id) {setEdge(selection.edge); setFocus({...selection.location});}
    else {pendingLocation.current = {id: selection.symbol_id, location: selection.location, edge: selection.edge}; choose(selection.symbol_id);}
    window.location.hash = 'explore';
  }
  async function expand(offset = 0) {
    const generation = viewGeneration.current;
    try {
      const result = await api<Neighborhood>('neighborhood?' + new URLSearchParams({id: active, direction, kind, offset: String(offset)}), ds);
      if (generation !== viewGeneration.current) return;
      setNodes(old => [...new Map([...old, ...result.nodes].map(n => [n.id, n])).values()]);
      setEdges(old => [...new Map([...old, ...result.edges].map(e => [e.id, e])).values()]);
      setNext(result.next_offset); setTotal(result.total);
    } catch (e) {setError((e as Error).message);}
  }
  function saveTrail() {
    if (!dataset || !steps.length || !trailName.trim()) return;
    const trail: Trail = {version: 1, dataset_id: ds!, revision: dataset.metadata.revision, name: trailName.trim(), steps};
    const updated = [...trails.filter(t => t.name !== trail.name), trail];
    try {localStorage.setItem('kse-trails-' + ds, JSON.stringify(updated)); setTrails(updated);} catch {setError('Browser storage is full; export the trail to keep it.');}
  }
  function exportTrail() {
    if (!dataset || !steps.length) return;
    const blob = new Blob([JSON.stringify({version: 1, dataset_id: ds, revision: dataset.metadata.revision, name: trailName || 'Navigation trail', steps}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'navigation-trail.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importTrail(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Trail file exceeds 1 MiB.');
      const t = JSON.parse(await file.text());
      if (t.version !== 1 || t.dataset_id !== ds || t.revision !== dataset?.metadata.revision) throw new Error('Trail belongs to a different dataset or unsupported format.');
      if (typeof t.name !== 'string' || t.name.length > 120 || !Array.isArray(t.steps) || t.steps.length > 200 || !t.steps.every((s: Step) => typeof s.symbol === 'string' && s.symbol.length < 4000 && typeof s.name === 'string' && typeof s.note === 'string' && s.note.length <= 2000 && typeof s.location?.file === 'string' && Number.isInteger(s.location.line) && s.location.line > 0 && Number.isInteger(s.location.column) && s.location.column > 0)) throw new Error('Invalid navigation trail.');
      setSteps(t.steps); setTrailName(t.name); setError('');
    } catch (e) {setError((e as Error).message);} finally {if (importRef.current) importRef.current.value = '';}
  }
  const successful = dataset?.coverage.filter(t => t.status === 'successful').length || 0;
  return <>
    <header className="masthead"><div><span className="app-mark" aria-hidden="true">⌘</span><strong>Kernel Source Explorer</strong><span className="app-purpose">Follow the source.</span></div><nav className="mode-navigation" aria-label="Workspace mode"><a href="#learn" aria-current={mode === 'learn' ? 'page' : undefined}>Learn</a><a href="#explore" onClick={() => {setGuided(undefined); setFullExplorer(true);}} aria-current={mode === 'explore' ? 'page' : undefined}>Explorer</a></nav></header>
    <section className="dataset-bar" aria-label="Active dataset">{dataset ? <><div><strong>{dataset.metadata.release}</strong><span>{dataset.metadata.architecture} / {dataset.metadata.kind}</span></div><div className="scope">{dataset.metadata.scope_label}<small>Bounded index: absence of an edge does not establish absence in the source tree.</small></div><details><summary>{successful}/{dataset.coverage.length} translation units successful · Coverage & metadata</summary><div className="metadata-popover"><h2>Dataset provenance</h2><dl><dt>Revision</dt><dd>{dataset.metadata.revision}</dd><dt>Configuration SHA-256</dt><dd>{dataset.metadata.configuration_hash}</dd><dt>Clang</dt><dd>{dataset.metadata.clang_versions.join(', ')}</dd><dt>Symbols / relationships</dt><dd>{dataset.symbol_count} / {dataset.relationship_count}</dd><dt>Provenance</dt><dd>{JSON.stringify(dataset.metadata.provenance)}</dd></dl>{dataset.coverage.map(t => <p key={t.id}><span className={'badge ' + t.status}>{t.status}</span> {t.path}</p>)}<h3>Diagnostics ({dataset.diagnostic_count})</h3>{dataset.diagnostics.map(d => <p key={d.id}>{d.severity}: {d.file}:{d.line} {d.message}</p>)}</div></details></> : <p>{indexError ? 'Source index unavailable. Reading topics and experiments are ready; prepare an index to open kernel checkpoints.' : 'Opening index…'}</p>}</section>
    {error && <div className="error" role="alert">{error} <button onClick={() => setError('')}>Dismiss</button></div>}
    <div hidden={mode !== 'learn'}><Learning dataset={ds} reader={reader} updateReader={updateReader} storageError={storageError} onExplore={openCheckpoint}/></div>
    <div hidden={mode !== 'explore'} className={guided && !fullExplorer ? 'explorer-shell guided-explorer' : 'explorer-shell'}>
    {guided && <section className="guided-context" aria-label="Guided source visit"><div className="guided-return"><a href={'#learn/' + guided.lesson.id}>Return to {guided.lesson.title}</a><button onClick={() => setFullExplorer(!fullExplorer)}>{fullExplorer ? 'Focus on this checkpoint' : 'Show full explorer'}</button></div><span className="book-reference">{guided.lesson.reference} / authored teaching note</span><h1>{guided.checkpoint.title}</h1><p className="guided-question">{guided.checkpoint.question}</p><p><strong>Notice:</strong> {guided.checkpoint.notice}</p><p><strong>Leave for later:</strong> {guided.checkpoint.ignore}</p></section>}
    {guided && !fullExplorer && <div className="checkpoint-graph-toggle"><button aria-expanded={showCheckpointGraph} onClick={()=>setShowCheckpointGraph(!showCheckpointGraph)}>{showCheckpointGraph ? 'Hide checkpoint graph' : 'Show checkpoint graph'}</button><span>One verified relationship, beside its source.</span></div>}
    <main className={guided && !fullExplorer && showCheckpointGraph ? 'workspace with-checkpoint-graph' : 'workspace'}>
      {guided && !fullExplorer && showCheckpointGraph && guided.checkpoint.selection && <CheckpointGraph selection={guided.checkpoint.selection} onSymbol={id=>{setFullExplorer(true);choose(id);}} onEdge={inspectEdge}/>}
      <aside className="search-pane"><h1>Find a symbol</h1><label>Symbol name<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Function, type, variable…"/></label><label>Source path<input value={path} onChange={e => setPath(e.target.value)} placeholder="e.g. kernel/"/></label><div className="result-count">{hits.length} results shown</div><nav aria-label="Search results" className="results">{hits.map(h => <button key={h.id} className={'result ' + (active === h.id ? 'active' : '')} onClick={() => choose(h.id)}><strong>{h.name}</strong><span>{h.kind} · {h.status !== 'successful' ? 'partial evidence' : h.is_definition ? 'definition' : 'declaration'}</span><small>{h.file}:{h.line}</small></button>)}{ds && !hits.length && <p className="empty">No indexed symbols match. Try a broader name or path.</p>}{searchMore && <button onClick={() => setSearchOffset(s => s + 40)}>More symbols</button>}</nav></aside>
      <section className="relationships-pane"><div className="pane-heading"><h2>Relationships</h2><div><button aria-label="Previous selection" disabled={historyIndex <= 0} onClick={() => {setHistoryIndex(historyIndex - 1); setActive(history[historyIndex - 1]);}}>←</button><button aria-label="Next selection" disabled={historyIndex >= history.length - 1} onClick={() => {setHistoryIndex(historyIndex + 1); setActive(history[historyIndex + 1]);}}>→</button></div></div>
        {active ? <><div className="graph-controls"><label>Direction<select aria-label="Direction" value={direction} onChange={e => setDirection(e.target.value)}><option value="both">Both directions</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select></label><label>Relationship<select aria-label="Relationship" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All kinds</option><option value="direct_call">Direct calls</option><option value="indirect_call">Indirect calls</option><option value="reference">References</option><option value="declared_type">Declared types</option></select></label></div><Graph nodes={selected && !nodes.some(n => n.id === active) ? [...nodes, selected] : nodes} edges={edges} active={active} onSymbol={choose} onEdge={inspectEdge}/><div className="graph-actions"><button onClick={() => expand()}>Expand</button><button onClick={() => {setEdges([]); setNodes(selected ? [selected] : []); setNext(null);}}>Collapse neighbors</button><span>{edges.length} / {total} evidence records</span>{next !== null && <button onClick={() => expand(next)}>More relationships</button>}</div><div className="evidence-list" aria-label="Relationship evidence">{edges.map(e => <div className={'evidence ' + (edge?.id === e.id ? 'selected' : '')} key={e.id}><button onClick={() => inspectEdge(e)}><span className={'edge-kind ' + e.kind}>{e.kind.replaceAll('_', ' ')}</span><strong>{e.source_name} → {e.target_name || 'unresolved target'}</strong><small>{e.file}:{e.line}:{e.column} · {e.status}</small></button>{e.target_id && <button className="follow" aria-label={'Follow ' + e.target_name} onClick={() => choose(e.target_id!)}>Open</button>}</div>)}{!edges.length && <p className="empty">No relationships shown. Expand the symbol or change the filters. Coverage is limited to the indexed scope.</p>}</div></> : <div className="start-state"><div className="source-glyph">ƒ</div><h3>Choose a starting point</h3><p>Find a symbol, follow its relationships, and inspect the source evidence.</p><p>Solid edges represent compiler facts. Dashed calls have an unresolved target.</p></div>}
      </section>
      <section className="source-pane"><div className="pane-heading"><h2>{selected?.name || 'Source'}</h2><span>{selected?.kind}</span></div>{selected && <div className="definition-picker"><label>Declarations & definitions<select aria-label="Source location" value={locations.find(l => l.file === focus?.file && l.line === focus?.line)?.id || ''} onChange={e => {const loc = locations.find(l => l.id === Number(e.target.value)); if (loc) {setEdge(undefined); setFocus(loc);}}}><option value="" disabled>Relationship evidence</option>{locations.map(l => <option key={l.id} value={l.id}>{l.is_definition ? 'Definition' : 'Declaration'} · {l.file}:{l.line} · {l.status}</option>)}</select></label></div>}
        {edge && <div className="evidence-detail"><strong>{edge.kind.replaceAll('_', ' ')} / {edge.resolution.replaceAll('_', ' ')}</strong><span>{edge.origin} · TU {edge.tu} · {edge.status}</span><span>Expansion: {edge.file}:{edge.line}:{edge.column}</span>{edge.spelling_file && (edge.spelling_file !== edge.file || edge.spelling_line !== edge.line || edge.spelling_column !== edge.column) && <button onClick={() => setFocus({file: edge.spelling_file!, line: edge.spelling_line!, column: edge.spelling_column!})}>Spelling: {edge.spelling_file}:{edge.spelling_line}:{edge.spelling_column}</button>}</div>}
        {source ? <><div className="source-path">{source.file}:{focus?.line}:{focus?.column}</div><div className="source-code" role="region" aria-label="Source code" tabIndex={0}>{source.lines.map((text, index) => <div key={source.start + index} className={'source-line ' + (source.start + index === focus?.line ? 'current' : '')} data-line={source.start + index}><span className="line-number">{source.start + index}</span><code dangerouslySetInnerHTML={{__html: hljs.highlight(text, {language: 'c'}).value || ' '}}/></div>)}</div><div className="source-controls"><button disabled={source.start === 1} onClick={() => setFocus({...focus!, line: Math.max(1, source.start - 20)})}>Earlier lines</button><span>{source.start}–{source.start + source.lines.length - 1} / {source.total_lines}</span><button disabled={source.start + source.lines.length > source.total_lines} onClick={() => setFocus({...focus!, line: Math.min(source.total_lines, source.start + source.lines.length + 12)})}>Later lines</button></div></> : <div className="empty">{active ? 'Select a definition or relationship to read its source.' : 'Source follows your selection.'}</div>}
        <section className="trail-panel"><h2>Navigation trail</h2><p className="muted">Your notes are annotations, separate from compiler evidence.</p><label>Note<textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)} placeholder="Why does this location matter?"/></label><button disabled={!selected || !focus || steps.length >= 200} onClick={() => {setSteps(old => [...old, {symbol: active, name: selected!.name, location: {file: focus!.file, line: focus!.line, column: focus!.column}, note}]); setNote('');}}>Add current location</button><ol>{steps.map((s, i) => <li key={i}><button onClick={() => {if (active === s.symbol) {setEdge(undefined); setFocus(s.location);} else {pendingLocation.current = {id: s.symbol, location: s.location}; choose(s.symbol);}}}>{s.name} · {s.location.file}:{s.location.line}</button>{s.note && <p>{s.note}</p>}</li>)}</ol><label>Trail name<input value={trailName} maxLength={120} onChange={e => setTrailName(e.target.value)}/></label><div className="trail-actions"><button disabled={!steps.length || !trailName.trim()} onClick={saveTrail}>Save trail</button><button disabled={!steps.length} onClick={exportTrail}>Export JSON</button><button onClick={() => importRef.current?.click()}>Import JSON</button><button disabled={!steps.length} onClick={() => setSteps([])}>Clear steps</button></div><input type="file" accept="application/json,.json" hidden ref={importRef} onChange={e => importTrail(e.target.files?.[0])}/>{trails.length > 0 && <label>Saved in this browser<select aria-label="Saved in this browser" value="" onChange={e => {const t = trails[Number(e.target.value)]; setSteps(t.steps); setTrailName(t.name);}}><option value="" disabled>Open a saved trail…</option>{trails.map((t, i) => <option value={i} key={t.name}>{t.name}</option>)}</select></label>}</section>
      </section>
    </main></div><footer>Compiler evidence, with its limits visible.<span>Offline after setup · No compilation while browsing</span></footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
