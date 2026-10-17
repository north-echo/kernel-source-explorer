import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import { Graph } from "./Graph";
import { CheckpointGraph } from "./CheckpointGraph";
import { api } from "./api";
import { Learning } from "./Learning";
import { useReaderState } from "./useReaderState";
import { emptyNotes } from "./learningTypes";
import type { Curriculum, GuidedContext } from "./learningTypes";
import {
  adjacentCenter,
  explorerHash,
  readExplorerHash,
} from "./explorerRoute";
import type {
  Dataset,
  Edge,
  Hit,
  Loc,
  Location,
  Neighborhood,
  Source,
  Step,
  SymbolInfo,
  Trail,
} from "./types";
import "./style.css";
import "./explorer.css";
import { ExplorerWelcome } from "./ExplorerWelcome";
import { ExplorerOrientation, jumpTo } from "./ExplorerOrientation";
import {
  checkpointContext,
  matchingQuestions,
  sourceCategory,
} from "./explorerTeaching";
import { SourceToken } from "./SourceToken";
hljs.registerLanguage("c", c);

function App() {
  const { reader, updateReader, storageError, quarantine, replaceRecord } =
    useReaderState();
  const [mode, setMode] = useState(
    window.location.hash.startsWith("#explore") ? "explore" : "learn",
  );
  const [guided, setGuided] = useState<GuidedContext>();
  const [fullExplorer, setFullExplorer] = useState(false);
  const sourceBefore =
    guided && !fullExplorer
      ? Math.max(4, guided.checkpoint.reading?.before || 4)
      : 12;
  const [showCheckpointGraph, setShowCheckpointGraph] = useState(true);
  useEffect(() => {
    const changed = () =>
      setMode(
        window.location.hash.startsWith("#explore") ? "explore" : "learn",
      );
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const [dataset, setDataset] = useState<Dataset>();
  const [error, setError] = useState("");
  const [indexError, setIndexError] = useState("");
  const [query, setQuery] = useState("");
  const [path, setPath] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchMore, setSearchMore] = useState(false);
  const [active, setActive] = useState("");
  const [selected, setSelected] = useState<SymbolInfo>();
  const [locations, setLocations] = useState<Location[]>([]);
  const [nodes, setNodes] = useState<SymbolInfo[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [edge, setEdge] = useState<Edge>();
  const [focus, setFocus] = useState<Loc>();
  const [source, setSource] = useState<Source>();
  const [sourceError, setSourceError] = useState("");
  const [browseLine, setBrowseLine] = useState<number>();
  const routeWritten = useRef("");
  const routeController = useRef<AbortController | undefined>(undefined);
  const activeRef = useRef(active);
  activeRef.current = active;
  const linkValid = useRef(true);
  const [searching, setSearching] = useState(false);
  const [searchFailure, setSearchFailure] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");
  const [recent, setRecent] = useState<SymbolInfo[]>([]);
  const [symbolKind, setSymbolKind] = useState("");
  const [definitionsOnly, setDefinitionsOnly] = useState(false);
  const [startingPoints, setStartingPoints] = useState<Curriculum>();
  const [direction, setDirection] = useState("both");
  const [kind, setKind] = useState("all");
  const [next, setNext] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [note, setNote] = useState("");
  const [trailName, setTrailName] = useState("");
  const [trails, setTrails] = useState<Trail[]>([]);
  const viewGeneration = useRef(0);
  const importRef = useRef<HTMLInputElement>(null);
  const pendingLocation = useRef<
    { id: string; location: Loc; edge?: Edge } | undefined
  >(undefined);
  const ds = dataset?.metadata.dataset_id;
  useEffect(() => {
    api<Dataset>("dataset")
      .then(setDataset)
      .catch((e) => setIndexError(e.message));
    api<Curriculum>("learning")
      .then(setStartingPoints)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!ds) return;
    try {
      setTrails(JSON.parse(localStorage.getItem("kse-trails-" + ds) || "[]"));
    } catch {
      setError("Saved trails could not be read.");
    }
  }, [ds]);
  const searchKey = JSON.stringify([
    query,
    path,
    symbolKind,
    definitionsOnly,
    searchOffset,
  ]);
  const pendingSearch =
    !!(query.trim() || path || symbolKind || definitionsOnly) &&
    (searching || completedSearch !== searchKey);
  useEffect(() => {
    if (selected)
      setRecent((old) =>
        [selected, ...old.filter((item) => item.id !== selected.id)].slice(
          0,
          8,
        ),
      );
  }, [selected]);
  useEffect(() => {
    setSearchOffset(0);
    setHits([]);
  }, [query, path, symbolKind, definitionsOnly]);
  useEffect(() => {
    if (!ds || (!query.trim() && !path && !symbolKind && !definitionsOnly)) {
      setHits([]);
      setSearching(false);
      setSearchMore(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    setSearchFailure("");
    const timer = setTimeout(() => {
      api<Hit[]>(
        "symbols?" +
          new URLSearchParams({
            q: query,
            path,
            symbol_kind: symbolKind,
            definitions_only: String(definitionsOnly),
            offset: String(searchOffset),
          }),
        ds,
        controller.signal,
      )
        .then((results) => {
          setHits((old) => (searchOffset ? [...old, ...results] : results));
          setSearchMore(results.length === 40);
          setSearching(false);
          setCompletedSearch(searchKey);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setSearchFailure(e.message);
            setSearching(false);
            setCompletedSearch(searchKey);
          }
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, path, ds, searchOffset, symbolKind, definitionsOnly]);
  function writeRoute(
    id: string,
    location?: Loc,
    selectedEdge?: Edge,
    browse?: number,
    context?: GuidedContext,
    replace = false,
    layout = fullExplorer,
  ) {
    if (!ds) return;
    routeController.current?.abort();
    linkValid.current = true;
    const hash = explorerHash({
      dataset: ds,
      symbol: id,
      location,
      evidence: selectedEdge?.id,
      browse,
      lesson: context?.lesson.id,
      checkpoint: context?.checkpoint.id,
      returnTo: context?.returnTo,
      journey: context?.journey,
      q: query,
      path,
      direction,
      kind,
      symbolKind,
      definitionsOnly,
      full: context ? layout : true,
    });
    if (replace) {
      if (routeWritten.current) routeWritten.current = hash;
      window.history.replaceState(null, "", hash);
      return;
    }
    if (window.location.hash !== hash) {
      routeWritten.current = hash;
      window.location.hash = hash;
    }
  }
  useEffect(() => {
    if (!ds) return;
    let controller: AbortController;
    const restore = async () => {
      if (routeWritten.current === window.location.hash) {
        routeWritten.current = "";
        return;
      }
      controller?.abort();
      controller = new AbortController();
      routeController.current = controller;
      try {
        const route = readExplorerHash(window.location.hash);
        if (!route) return;
        if (route.guide) {
          linkValid.current = false;
          const content = await api<Curriculum>(
            "learning",
            ds,
            controller.signal,
          );
          const lesson = content.lessons.find(
            (t) => t.id === route.guide && t.explorer_start,
          );
          if (!lesson)
            throw new Error(
              "This guided question is unavailable. Choose one of the starting questions.",
            );
          const checkpoint = lesson.checkpoints.find(
            (c) => c.id === lesson.explorer_start!.checkpoint,
          );
          if (!checkpoint?.available)
            throw new Error(
              checkpoint?.reason ||
                "No reviewed source is available for this question. Read the C investigation first.",
            );
          if (!controller.signal.aborted)
            openCheckpoint(checkpointContext(lesson, checkpoint));
          return;
        }
        if (route.dataset !== ds) {
          linkValid.current = false;
          setGuided(undefined);
          setActive("");
          setSelected(undefined);
          setFocus(undefined);
          setSource(undefined);
          setEdge(undefined);
          setNodes([]);
          setEdges([]);
          setError(
            "This source link belongs to a different dataset. Open its matching dataset or choose a new starting point.",
          );
          return;
        }
        linkValid.current = false;
        setSource(undefined);
        let context: GuidedContext | undefined;
        if (route.lesson || route.checkpoint) {
          const content = await api<Curriculum>(
            "learning",
            ds,
            controller.signal,
          );
          const lesson = content.lessons.find((t) => t.id === route.lesson);
          const checkpoint = lesson?.checkpoints.find(
            (c) => c.id === route.checkpoint,
          );
          if (!lesson || !checkpoint?.available || !checkpoint.selection)
            throw new Error(
              "The originating checkpoint is unavailable in this dataset.",
            );
          if (
            route.journey &&
            !content.lessons.some((l) => l.id === route.journey)
          )
            throw new Error("The originating question is unavailable.");
          context = {
            lesson,
            checkpoint,
            returnTo: route.returnTo,
            journey: route.journey,
          };
        }
        const selectedEdge = route.evidence
          ? await api<Edge>(
              "relationship?id=" + route.evidence,
              ds,
              controller.signal,
            )
          : undefined;
        if (
          selectedEdge &&
          selectedEdge.source_id !== route.symbol &&
          selectedEdge.target_id !== route.symbol
        )
          throw new Error(
            "This evidence does not belong to the linked symbol.",
          );
        if (controller.signal.aborted) return;
        const location =
          route.location ||
          (route.symbol === context?.checkpoint.selection?.symbol_id
            ? context?.checkpoint.selection?.location
            : undefined);
        if (!route.symbol) {
          setActive("");
          setSelected(undefined);
          setFocus(undefined);
          setSource(undefined);
          setEdge(undefined);
        }
        setGuided(context);
        setFullExplorer(route.full ?? !context);
        setBrowseLine(route.browse);
        setQuery(route.q || "");
        setPath(route.path || "");
        setSymbolKind(route.symbolKind || "");
        setDefinitionsOnly(route.definitionsOnly || false);
        setDirection(route.direction || (context ? "outgoing" : "both"));
        setKind(route.kind || (context ? "direct_call" : "all"));
        setError("");
        if (activeRef.current === route.symbol) {
          if (location) setFocus(location);
          setEdge(selectedEdge);
        } else {
          pendingLocation.current = location
            ? { id: route.symbol, location, edge: selectedEdge }
            : undefined;
          setActive(route.symbol);
        }
        linkValid.current = true;
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          linkValid.current = false;
          setActive("");
          setSelected(undefined);
          setFocus(undefined);
          setSource(undefined);
          setEdge(undefined);
          setError((e as Error).message);
        }
      }
    };
    restore();
    window.addEventListener("hashchange", restore);
    return () => {
      controller?.abort();
      window.removeEventListener("hashchange", restore);
    };
  }, [ds]);
  useEffect(() => {
    if (
      mode === "explore" &&
      active &&
      selected?.id === active &&
      focus &&
      linkValid.current
    )
      writeRoute(active, focus, edge, browseLine, guided, true);
    else if (mode === "explore" && !active && linkValid.current && ds)
      writeRoute("", undefined, undefined, undefined, undefined, true);
  }, [
    focus,
    browseLine,
    edge,
    ds,
    selected?.id,
    fullExplorer,
    direction,
    kind,
    symbolKind,
    definitionsOnly,
    query,
    path,
    mode,
  ]);
  const choose = useCallback(
    (id: string) => {
      setActive(id);
      setEdge(undefined);
      setBrowseLine(undefined);
      setError("");
      writeRoute(id, undefined, undefined, undefined, guided);
    },
    [
      ds,
      query,
      path,
      guided,
      fullExplorer,
      direction,
      kind,
      symbolKind,
      definitionsOnly,
    ],
  );
  const inspectEdge = useCallback(
    (e: Edge) => {
      setEdge(e);
      setFocus(e);
      setBrowseLine(undefined);
      setError("");
      writeRoute(active, e, e, undefined, guided);
    },
    [
      ds,
      active,
      guided,
      query,
      path,
      fullExplorer,
      direction,
      kind,
      symbolKind,
      definitionsOnly,
    ],
  );
  useEffect(() => {
    if (!active || !ds) return;
    const controller = new AbortController();
    setSource(undefined);
    setFocus(undefined);
    setLocations([]);
    setSelected(undefined);
    setEdge(undefined);
    api<{ symbol: SymbolInfo; locations: Location[] }>(
      "symbol?" + new URLSearchParams({ id: active }),
      ds,
      controller.signal,
    )
      .then((detail) => {
        const pending =
          pendingLocation.current?.id === active
            ? pendingLocation.current
            : undefined;
        setSelected(detail.symbol);
        setLocations(detail.locations);
        setFocus(pending?.location || detail.locations[0]);
        setEdge(pending?.edge);
        pendingLocation.current = undefined;
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [active, ds]);
  useEffect(() => {
    viewGeneration.current += 1;
    if (!active || !ds) return;
    const controller = new AbortController();
    setNodes([]);
    setEdges([]);
    setNext(null);
    setTotal(0);
    api<Neighborhood>(
      "neighborhood?" + new URLSearchParams({ id: active, direction, kind }),
      ds,
      controller.signal,
    )
      .then((result) => {
        setNodes(result.nodes);
        setEdges(result.edges);
        setNext(result.next_offset);
        setTotal(result.total);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [active, ds, direction, kind]);
  useEffect(() => {
    if (!focus || !ds) return;
    const controller = new AbortController();
    setSource(undefined);
    setSourceError("");
    api<Source>(
      "source?" +
        new URLSearchParams({
          file: focus.file,
          line: String(browseLine ?? focus.line),
          before: String(sourceBefore),
          after: guided && !fullExplorer ? "12" : "30",
        }),
      ds,
      controller.signal,
    )
      .then(setSource)
      .catch((e) => {
        if (e.name !== "AbortError") setSourceError(e.message);
      });
    return () => controller.abort();
  }, [focus, browseLine, ds, guided, fullExplorer]);
  useEffect(() => {
    if (mode !== "explore") return;
    const region = document.querySelector<HTMLElement>(".source-code");
    const line = region?.querySelector<HTMLElement>(".source-line.current");
    const token = line?.querySelector<HTMLElement>(".selected-token");
    if (region && line) {
      region.scrollTop +=
        line.getBoundingClientRect().top -
        region.getBoundingClientRect().top -
        40;
      if (token)
        region.scrollLeft = Math.max(
          0,
          region.scrollLeft +
            token.getBoundingClientRect().left -
            region.getBoundingClientRect().left -
            region.clientWidth / 3,
        );
    }
  }, [source, mode]);
  useEffect(() => {
    if (!guided || !ds || !source || !guided.checkpoint.selection) return;
    const location = guided.checkpoint.selection.location;
    if (
      source.file !== location.file ||
      source.line !== location.line ||
      reader.notes[guided.lesson.id]?.visited[guided.checkpoint.id] === ds
    )
      return;
    updateReader((old) => {
      const notes = old.notes[guided.lesson.id] || emptyNotes();
      return {
        ...old,
        notes: {
          ...old.notes,
          [guided.lesson.id]: {
            ...notes,
            visited: { ...notes.visited, [guided.checkpoint.id]: ds },
          },
        },
      };
    });
  }, [source, guided, ds, reader.notes, updateReader]);
  useEffect(() => {
    if (
      !source ||
      !focus ||
      !selected ||
      selected.id !== active ||
      !linkValid.current ||
      mode !== "explore" ||
      !window.location.hash.startsWith("#explore?") ||
      source.line !== (browseLine ?? focus.line) ||
      source.file !== focus.file
    )
      return;
    const hash = window.location.hash;
    const label = (
      selected.name +
      " · " +
      source.file +
      ":" +
      source.start +
      "–" +
      (source.start + source.lines.length - 1)
    ).slice(0, 500);
    updateReader((old) =>
      old.lastExploration?.hash === hash
        ? old
        : { ...old, lastExploration: { hash, label } },
    );
  }, [source, focus, selected, mode, ds]);
  function openCheckpoint(context: GuidedContext) {
    const selection = context.checkpoint.selection;
    if (!selection || context.checkpoint.dataset_id !== ds) {
      setError(
        "The checkpoint belongs to another dataset. Reload the reading companion.",
      );
      return;
    }
    setGuided(context);
    setFullExplorer(false);
    setShowCheckpointGraph(true);
    setDirection("outgoing");
    setKind("direct_call");
    if (activeRef.current === selection.symbol_id) {
      setEdge(selection.edge);
      setFocus({ ...selection.location });
    } else {
      pendingLocation.current = {
        id: selection.symbol_id,
        location: selection.location,
        edge: selection.edge,
      };
      setActive(selection.symbol_id);
      setError("");
    }
    setBrowseLine(undefined);
    writeRoute(
      selection.symbol_id,
      selection.location,
      selection.edge,
      undefined,
      context,
      false,
      false,
    );
  }
  function readDefinition() {
    const location = locations.find((l) => l.is_definition);
    if (!location) return;
    setEdge(undefined);
    setBrowseLine(undefined);
    setFocus(location);
    writeRoute(active, location, undefined, undefined, guided);
  }
  function openSymbolDefinition(id: string) {
    if (id === active) {
      setFullExplorer(true);
      readDefinition();
      return;
    }
    setFullExplorer(true);
    setActive(id);
    setEdge(undefined);
    setBrowseLine(undefined);
    setError("");
    writeRoute(id, undefined, undefined, undefined, guided, false, true);
  }
  function showCallers() {
    setFullExplorer(true);
    setDirection("incoming");
    setKind("direct_call");
    writeRoute(active, focus, edge, browseLine, guided, false, true);
    jumpTo(".relationships-pane h2");
  }
  function showSurrounding() {
    if (!focus) return;
    const center = Math.max(1, focus.line - 6);
    setBrowseLine(center);
    writeRoute(active, focus, edge, center, guided);
    jumpTo(".source-pane h2");
  }
  async function expand(offset = 0) {
    const generation = viewGeneration.current;
    try {
      const result = await api<Neighborhood>(
        "neighborhood?" +
          new URLSearchParams({
            id: active,
            direction,
            kind,
            offset: String(offset),
          }),
        ds,
      );
      if (generation !== viewGeneration.current) return;
      setNodes((old) => [
        ...new Map([...old, ...result.nodes].map((n) => [n.id, n])).values(),
      ]);
      setEdges((old) => [
        ...new Map([...old, ...result.edges].map((e) => [e.id, e])).values(),
      ]);
      setNext(result.next_offset);
      setTotal(result.total);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function saveTrail() {
    if (!dataset || !steps.length || !trailName.trim()) return;
    const trail: Trail = {
      version: 1,
      dataset_id: ds!,
      revision: dataset.metadata.revision,
      name: trailName.trim(),
      steps,
    };
    const updated = [...trails.filter((t) => t.name !== trail.name), trail];
    try {
      localStorage.setItem("kse-trails-" + ds, JSON.stringify(updated));
      setTrails(updated);
    } catch {
      setError("Browser storage is full; export the trail to keep it.");
    }
  }
  function exportTrail() {
    if (!dataset || !steps.length) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            dataset_id: ds,
            revision: dataset.metadata.revision,
            name: trailName || "Navigation trail",
            steps,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "navigation-trail.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importTrail(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("Trail file exceeds 1 MiB.");
      const t = JSON.parse(await file.text());
      if (
        t.version !== 1 ||
        t.dataset_id !== ds ||
        t.revision !== dataset?.metadata.revision
      )
        throw new Error(
          "Trail belongs to a different dataset or unsupported format.",
        );
      if (
        typeof t.name !== "string" ||
        t.name.length > 120 ||
        !Array.isArray(t.steps) ||
        t.steps.length > 200 ||
        !t.steps.every(
          (s: Step) =>
            typeof s.symbol === "string" &&
            s.symbol.length < 4000 &&
            typeof s.name === "string" &&
            typeof s.note === "string" &&
            s.note.length <= 2000 &&
            typeof s.location?.file === "string" &&
            Number.isInteger(s.location.line) &&
            s.location.line > 0 &&
            Number.isInteger(s.location.column) &&
            s.location.column > 0,
        )
      )
        throw new Error("Invalid navigation trail.");
      setSteps(t.steps);
      setTrailName(t.name);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }
  useEffect(() => {
    if (mode === "explore") {
      document.title =
        (selected?.name || "Source explorer") + " · Kernel Source Explorer";
      jumpTo(selected ? ".explorer-orientation h2" : ".explorer-welcome h1");
    }
  }, [mode, selected?.id, edge?.id, focus?.file, focus?.line, focus?.column]);
  const originLesson = startingPoints?.lessons.find(
    (l) => l.id === (guided?.journey || guided?.lesson.id),
  );
  const successful =
    dataset?.coverage.filter((t) => t.status === "successful").length || 0;
  return (
    <>
      <a
        className="skip-link"
        href="#workspace-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("workspace-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="masthead">
        <div>
          <span className="app-mark" aria-hidden="true">
            ⌘
          </span>
          <strong>Kernel Source Explorer</strong>
          <span className="app-purpose">Follow the source.</span>
        </div>
        <nav className="mode-navigation" aria-label="Workspace mode">
          <a href="#learn" aria-current={mode === "learn" ? "page" : undefined}>
            Learn
          </a>
          <a
            href="#explore"
            onClick={() => {
              setGuided(undefined);
              setFullExplorer(true);
            }}
            aria-current={mode === "explore" ? "page" : undefined}
          >
            Explorer
          </a>
        </nav>
      </header>
      <details className="mobile-dataset">
        <summary>
          Source dataset: {dataset?.metadata.release || "unavailable"}
        </summary>
        <p>
          {dataset?.metadata.scope_label ||
            indexError ||
            "No index is required for reading and code walkthroughs."}
        </p>
        <p>Bounded compiler evidence; runtime experiments are separate.</p>
      </details>
      <section className="dataset-bar" aria-label="Active dataset">
        {dataset ? (
          <>
            <div>
              <strong>{dataset.metadata.release}</strong>
              <span>
                {dataset.metadata.architecture} / {dataset.metadata.kind}
              </span>
            </div>
            <div className="scope">
              {dataset.metadata.scope_label}
              <small>
                Bounded index: absence of an edge does not establish absence in
                the source tree.
              </small>
            </div>
            <details>
              <summary>
                {successful}/{dataset.coverage.length} translation units
                successful · Coverage & metadata
              </summary>
              <div className="metadata-popover">
                <h2>Dataset provenance</h2>
                <dl>
                  <dt>Revision</dt>
                  <dd>{dataset.metadata.revision}</dd>
                  <dt>Configuration SHA-256</dt>
                  <dd>{dataset.metadata.configuration_hash}</dd>
                  <dt>Clang</dt>
                  <dd>{dataset.metadata.clang_versions.join(", ")}</dd>
                  <dt>Symbols / relationships</dt>
                  <dd>
                    {dataset.symbol_count} / {dataset.relationship_count}
                  </dd>
                  <dt>Provenance</dt>
                  <dd>{JSON.stringify(dataset.metadata.provenance)}</dd>
                </dl>
                {dataset.coverage.map((t) => (
                  <p key={t.id}>
                    <span className={"badge " + t.status}>{t.status}</span>{" "}
                    {t.path}
                  </p>
                ))}
                <h3>Diagnostics ({dataset.diagnostic_count})</h3>
                {dataset.diagnostics.map((d) => (
                  <p key={d.id}>
                    {d.severity}: {d.file}:{d.line} {d.message}
                  </p>
                ))}
              </div>
            </details>
          </>
        ) : (
          <p>
            {indexError
              ? "Source index unavailable. Reading topics and experiments are ready; prepare an index to open kernel checkpoints."
              : "Opening index…"}
          </p>
        )}
      </section>
      {error && (
        <div className="error" role="alert">
          {error} <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <div hidden={mode !== "learn"}>
        <Learning
          dataset={ds}
          reader={reader}
          updateReader={updateReader}
          storageError={storageError}
          quarantine={quarantine}
          replaceRecord={replaceRecord}
          onExplore={openCheckpoint}
        />
      </div>
      <div
        data-selected={!!active}
        hidden={mode !== "explore"}
        className={
          guided && !fullExplorer
            ? "explorer-shell guided-explorer"
            : "explorer-shell"
        }
      >
        {!active && (
          <ExplorerWelcome
            content={startingPoints}
            onFree={() => jumpTo(".search-pane input")}
          />
        )}
        {guided && (
          <section className="guided-context" aria-label="Guided source visit">
            <div className="guided-return">
              <a
                href={
                  guided.returnTo ||
                  "#learn/" + guided.lesson.id + "?view=source"
                }
              >
                Return to {originLesson?.title || guided.lesson.title}
              </a>
              <button
                onClick={() => {
                  if (fullExplorer) {
                    openCheckpoint(guided);
                    return;
                  }
                  setFullExplorer(true);
                  writeRoute(
                    active,
                    focus,
                    edge,
                    browseLine,
                    guided,
                    false,
                    !fullExplorer,
                  );
                }}
              >
                {fullExplorer
                  ? "Focus on this checkpoint"
                  : "Show full explorer"}
              </button>
            </div>
            <span className="book-reference">
              {guided.lesson.reference} / authored teaching note
            </span>
            <p className="guided-origin">
              Guided exploration
              {originLesson?.explorer_start
                ? " · " + originLesson.explorer_start.question
                : ""}
            </p>
            <h1>{guided.checkpoint.title}</h1>
            <p className="guided-question">{guided.checkpoint.question}</p>
          </section>
        )}
        {guided && !fullExplorer && (
          <div className="checkpoint-graph-toggle">
            <button
              aria-expanded={showCheckpointGraph}
              onClick={() => setShowCheckpointGraph(!showCheckpointGraph)}
            >
              {showCheckpointGraph
                ? "Hide checkpoint graph"
                : "Show checkpoint graph"}
            </button>
            <span>
              {guided.checkpoint.selection?.edge
                ? "One verified relationship, beside its source."
                : "One indexed definition, beside its source."}
            </span>
          </div>
        )}
        <main
          id={mode === "explore" ? "workspace-content" : undefined}
          tabIndex={-1}
          className={
            guided && !fullExplorer && showCheckpointGraph
              ? "workspace with-checkpoint-graph"
              : "workspace"
          }
        >
          {selected && (
            <ExplorerOrientation
              content={startingPoints}
              dataset={ds}
              selected={selected}
              focus={focus}
              edge={edge}
              locations={locations}
              guided={guided}
              onDefinition={readDefinition}
              onCallee={() =>
                edge?.target_id && openSymbolDefinition(edge.target_id)
              }
              onCallers={showCallers}
              onSurrounding={showSurrounding}
              onCheckpoint={openCheckpoint}
            />
          )}
          {guided &&
            !fullExplorer &&
            showCheckpointGraph &&
            guided.checkpoint.selection && (
              <CheckpointGraph
                selection={guided.checkpoint.selection}
                onSymbol={openSymbolDefinition}
                onEdge={inspectEdge}
                selectedEdge={edge?.id}
              />
            )}
          <aside className="search-pane">
            <h1>Free exploration</h1>
            <p className="search-introduction">
              Search exact indexed names or a familiar API. Curated questions
              below are separate from compiler matches.
            </p>
            <label>
              Symbol name
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Function, type, variable…"
              />
            </label>
            <label>
              Source path
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="e.g. kernel/"
              />
            </label>
            <label>
              Symbol kind
              <select
                aria-label="Symbol kind"
                value={symbolKind}
                onChange={(e) => setSymbolKind(e.target.value)}
              >
                <option value="">All kinds</option>
                <option value="function">Functions</option>
                <option value="struct">Structs</option>
                <option value="variable">Variables</option>
                <option value="typedef">Typedefs</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={definitionsOnly}
                onChange={(e) => setDefinitionsOnly(e.target.checked)}
              />{" "}
              Definitions only
            </label>
            <div role="status">
              {pendingSearch ? "Searching…" : searchFailure || ""}
            </div>
            <div className="result-count">{hits.length} results shown</div>
            {query.trim() && startingPoints && (
              <section className="curated-matches">
                <h2>Curated API questions</h2>
                <p>
                  Teaching links across layers, not compiler-resolved edges.
                </p>
                {matchingQuestions(startingPoints, query).map((lesson) => (
                  <div className="curated-question" key={lesson.id}>
                    <a href={"#explore?guide=" + lesson.id}>
                      {lesson.explorer_start!.question}
                    </a>
                    <p>
                      {lesson.checkpoints.find(
                        (c) => c.id === lesson.explorer_start!.checkpoint,
                      )?.available
                        ? "Reviewed source available"
                        : "Source unavailable in this index; the question remains readable in the starting questions."}
                    </p>
                    <a
                      href={
                        "#learn/" +
                        lesson.id +
                        "?view=code&segment=" +
                        lesson.explorer_start!.segment
                      }
                    >
                      Read its C walkthrough
                    </a>
                  </div>
                ))}
                <h3>Related reading (curated)</h3>
                <p>
                  Concept suggestions, separate from indexed symbol matches.
                </p>
                {startingPoints.lessons
                  .filter((t) =>
                    `${t.title} ${t.apis?.join(" ")} ${t.terms.join(" ")} ${t.synonyms?.join(" ")}`
                      .toLowerCase()
                      .includes(query.toLowerCase().trim()),
                  )
                  .slice(0, 5)
                  .map((t) => (
                    <a key={t.id} href={"#learn/" + t.id}>
                      {t.title}
                    </a>
                  ))}
              </section>
            )}
            <nav aria-label="Search results" className="results">
              {hits.map((h) => (
                <button
                  key={h.id}
                  className={"result " + (active === h.id ? "active" : "")}
                  onClick={() => choose(h.id)}
                >
                  <strong>{h.name}</strong>
                  <span>
                    {h.kind} ·{" "}
                    {h.status !== "successful"
                      ? "partial evidence"
                      : h.is_definition
                        ? "definition"
                        : "declaration"}
                  </span>
                  <small>
                    {h.file}:{h.line}
                  </small>
                </button>
              ))}
              {ds &&
                !pendingSearch &&
                !searchFailure &&
                (query.trim() || path || symbolKind || definitionsOnly) &&
                !hits.length && (
                  <p className="empty">
                    No indexed symbols match. Try a broader name or path.
                  </p>
                )}
              {!query.trim() && !path && !symbolKind && !definitionsOnly && (
                <section className="explorer-starts">
                  <h2>Recent exploration</h2>
                  {recent.length > 0 && (
                    <section className="recent-selections">
                      <h3>Recent symbol selections</h3>
                      {recent.map((item) => (
                        <button key={item.id} onClick={() => choose(item.id)}>
                          {item.name}
                        </button>
                      ))}
                    </section>
                  )}
                  <p>
                    These teaching suggestions link concepts to reviewed
                    compiler locations; they are not cross-layer compiler edges.
                  </p>
                  <p>
                    For book ideas or API names,{" "}
                    <a href="#learn/catalog">search the chapter library</a>.
                  </p>
                </section>
              )}
              {searchMore && (
                <button onClick={() => setSearchOffset((s) => s + 40)}>
                  More symbols
                </button>
              )}
            </nav>
          </aside>
          <section className="relationships-pane">
            <div className="pane-heading">
              <h2 tabIndex={-1}>Relationships</h2>
              <div>
                <button
                  aria-label="Previous selection"
                  disabled={!active}
                  onClick={() => window.history.back()}
                >
                  ←
                </button>
                <button
                  aria-label="Next selection"
                  disabled={!active}
                  onClick={() => window.history.forward()}
                >
                  →
                </button>
              </div>
            </div>
            {active ? (
              <>
                <div className="graph-controls">
                  <label>
                    Direction
                    <select
                      aria-label="Direction"
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                    >
                      <option value="both">Both directions</option>
                      <option value="incoming">Incoming</option>
                      <option value="outgoing">Outgoing</option>
                    </select>
                  </label>
                  <label>
                    Relationship
                    <select
                      aria-label="Relationship"
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="all">All kinds</option>
                      <option value="direct_call">Direct calls</option>
                      <option value="indirect_call">Indirect calls</option>
                      <option value="reference">References</option>
                      <option value="declared_type">Declared types</option>
                    </select>
                  </label>
                </div>
                <Graph
                  nodes={
                    selected && !nodes.some((n) => n.id === active)
                      ? [...nodes, selected]
                      : nodes
                  }
                  edges={edges}
                  active={active}
                  onSymbol={openSymbolDefinition}
                  onEdge={inspectEdge}
                  selectedEdge={edge?.id}
                />
                <div className="graph-actions">
                  {!edges.length && (
                    <button onClick={() => expand()}>
                      Show neighboring symbols
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEdges([]);
                      setNodes(selected ? [selected] : []);
                      setNext(null);
                    }}
                  >
                    Collapse neighbors
                  </button>
                  <span>
                    {
                      new Set(
                        edges
                          .flatMap((e) => [e.source_id, e.target_id])
                          .filter((id) => id && id !== active),
                      ).size
                    }{" "}
                    unique loaded neighbors · {edges.length} / {total} evidence
                    records
                  </span>
                  {next !== null && (
                    <button onClick={() => expand(next)}>
                      Load more evidence
                    </button>
                  )}
                </div>
                <div
                  className="evidence-list"
                  aria-label="Relationship evidence"
                >
                  {edges.map((e) => (
                    <div
                      className={
                        "evidence " + (edge?.id === e.id ? "selected" : "")
                      }
                      key={e.id}
                    >
                      <button onClick={() => inspectEdge(e)}>
                        <span className={"edge-kind " + e.kind}>
                          {e.kind.replaceAll("_", " ")}
                        </span>
                        <strong>
                          {e.source_name} →{" "}
                          {e.target_name || "unresolved target"}
                        </strong>
                        <small>
                          {e.file}:{e.line}:{e.column} · {e.status}
                        </small>
                      </button>
                      {e.target_id && (
                        <button
                          className="follow"
                          aria-label={"Follow " + e.target_name}
                          onClick={() => openSymbolDefinition(e.target_id!)}
                        >
                          Open
                        </button>
                      )}
                    </div>
                  ))}
                  {!edges.length && (
                    <p className="empty">
                      No relationships shown. Expand the symbol or change the
                      filters. Coverage is limited to the indexed scope.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="start-state">
                <div className="source-glyph">ƒ</div>
                <h3>Choose a starting point</h3>
                <p>
                  Find a symbol, follow its relationships, and inspect the
                  source evidence.
                </p>
                <p>
                  Solid edges represent compiler facts. Dashed calls have an
                  unresolved target.
                </p>
              </div>
            )}
          </section>
          <section className="source-pane">
            <div className="pane-heading">
              <h2 tabIndex={-1}>{selected?.name || "Source"}</h2>
              <span>{selected?.kind}</span>
            </div>
            {selected && (
              <p className="source-caption">
                {sourceCategory(selected, focus, edge, locations)}.{" "}
                {source &&
                focus &&
                (focus.line < source.start ||
                  focus.line >= source.start + source.lines.length) ? (
                  "The selected anchor is outside this window; Return to selected location recovers it."
                ) : (
                  <>The darker token marks source column {focus?.column}.</>
                )}{" "}
                Paging changes the window, not this anchor.
              </p>
            )}
            {selected && (
              <div className="definition-picker">
                <label>
                  Declarations & definitions
                  <select
                    aria-label="Source location"
                    value={
                      locations.find(
                        (l) => l.file === focus?.file && l.line === focus?.line,
                      )?.id || ""
                    }
                    onChange={(e) => {
                      const loc = locations.find(
                        (l) => l.id === Number(e.target.value),
                      );
                      if (loc) {
                        setEdge(undefined);
                        setBrowseLine(undefined);
                        setFocus(loc);
                        writeRoute(active, loc, undefined, undefined, guided);
                      }
                    }}
                  >
                    <option value="" disabled>
                      Relationship evidence
                    </option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.is_definition ? "Definition" : "Declaration"} ·{" "}
                        {l.file}:{l.line} · {l.status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {edge && (
              <div className="evidence-detail">
                <strong>
                  {edge.kind.replaceAll("_", " ")} /{" "}
                  {edge.resolution.replaceAll("_", " ")}
                </strong>
                <span>
                  {edge.origin} · TU {edge.tu} · {edge.status}
                </span>
                <span>
                  Expansion: {edge.file}:{edge.line}:{edge.column}
                </span>
                {edge.spelling_file &&
                  (edge.spelling_file !== edge.file ||
                    edge.spelling_line !== edge.line ||
                    edge.spelling_column !== edge.column) && (
                    <button
                      onClick={() => {
                        const location = {
                          file: edge.spelling_file!,
                          line: edge.spelling_line!,
                          column: edge.spelling_column!,
                        };
                        setBrowseLine(undefined);
                        setFocus(location);
                        writeRoute(active, location, edge, undefined, guided);
                      }}
                    >
                      Spelling: {edge.spelling_file}:{edge.spelling_line}:
                      {edge.spelling_column}
                    </button>
                  )}
              </div>
            )}
            {source ? (
              <>
                <div className="source-path">
                  Selected anchor: {source.file}:{focus?.line}:{focus?.column}
                </div>
                <div
                  className="source-code"
                  role="region"
                  aria-label="Source code"
                  tabIndex={0}
                >
                  {source.lines.map((text, index) => (
                    <div
                      key={source.start + index}
                      className={
                        "source-line " +
                        (source.start + index === focus?.line ? "current" : "")
                      }
                      data-line={source.start + index}
                    >
                      <span className="line-number">
                        {source.start + index}
                      </span>
                      <SourceToken
                        text={text}
                        column={
                          source.start + index === focus?.line
                            ? focus.column
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="source-controls">
                  <button
                    disabled={source.start === 1}
                    onClick={() => {
                      const line = adjacentCenter(
                        source.start,
                        source.lines.length,
                        source.total_lines,
                        sourceBefore,
                        guided && !fullExplorer ? 12 : 30,
                        "earlier",
                      );
                      setBrowseLine(line);
                      writeRoute(active, focus, edge, line, guided);
                    }}
                  >
                    Earlier lines
                  </button>
                  <button
                    onClick={() => {
                      setBrowseLine(undefined);
                      if (edge) setFocus(edge);
                      writeRoute(
                        active,
                        edge || focus,
                        edge,
                        undefined,
                        guided,
                      );
                    }}
                  >
                    Return to {edge ? "call site" : "selected location"}
                  </button>
                  <span>
                    {source.start}–{source.start + source.lines.length - 1} /{" "}
                    {source.total_lines}
                  </span>
                  <button
                    disabled={
                      source.start + source.lines.length > source.total_lines
                    }
                    onClick={() => {
                      const line = adjacentCenter(
                        source.start,
                        source.lines.length,
                        source.total_lines,
                        sourceBefore,
                        guided && !fullExplorer ? 12 : 30,
                        "later",
                      );
                      setBrowseLine(line);
                      writeRoute(active, focus, edge, line, guided);
                    }}
                  >
                    Later lines
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">
                {sourceError ? (
                  <div role="alert">
                    <p>{sourceError}</p>
                    <p>
                      The evidence anchor remains selected; restore the indexed
                      source before retrying.
                    </p>
                    <button
                      onClick={() =>
                        setFocus((old) => (old ? { ...old } : old))
                      }
                    >
                      Retry selected source
                    </button>
                  </div>
                ) : active ? (
                  "Select a definition or relationship to read its source."
                ) : (
                  "Source follows your selection."
                )}
              </div>
            )}
            <section className="trail-panel">
              <h2>Navigation trail</h2>
              <p className="muted">
                Your notes are annotations, separate from compiler evidence.
              </p>
              <label>
                Note
                <textarea
                  value={note}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why does this location matter?"
                />
              </label>
              <button
                disabled={!selected || !focus || steps.length >= 200}
                onClick={() => {
                  setSteps((old) => [
                    ...old,
                    {
                      symbol: active,
                      name: selected!.name,
                      location: {
                        file: focus!.file,
                        line: focus!.line,
                        column: focus!.column,
                      },
                      note,
                    },
                  ]);
                  setNote("");
                }}
              >
                Add selected location
              </button>
              <ol>
                {steps.map((s, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        if (active === s.symbol) {
                          setEdge(undefined);
                          setBrowseLine(undefined);
                          setFocus(s.location);
                          writeRoute(
                            active,
                            s.location,
                            undefined,
                            undefined,
                            guided,
                          );
                        } else {
                          pendingLocation.current = {
                            id: s.symbol,
                            location: s.location,
                          };
                          choose(s.symbol);
                        }
                      }}
                    >
                      {s.name} · {s.location.file}:{s.location.line}
                    </button>
                    {s.note && <p>{s.note}</p>}
                  </li>
                ))}
              </ol>
              <label>
                Trail name
                <input
                  value={trailName}
                  maxLength={120}
                  onChange={(e) => setTrailName(e.target.value)}
                />
              </label>
              <div className="trail-actions">
                <button
                  disabled={!steps.length || !trailName.trim()}
                  onClick={saveTrail}
                >
                  Save trail
                </button>
                <button disabled={!steps.length} onClick={exportTrail}>
                  Export JSON
                </button>
                <button onClick={() => importRef.current?.click()}>
                  Import JSON
                </button>
                <button disabled={!steps.length} onClick={() => setSteps([])}>
                  Clear steps
                </button>
              </div>
              <input
                type="file"
                accept="application/json,.json"
                hidden
                ref={importRef}
                onChange={(e) => importTrail(e.target.files?.[0])}
              />
              {trails.length > 0 && (
                <label>
                  Saved in this browser
                  <select
                    aria-label="Saved in this browser"
                    value=""
                    onChange={(e) => {
                      const t = trails[Number(e.target.value)];
                      setSteps(t.steps);
                      setTrailName(t.name);
                    }}
                  >
                    <option value="" disabled>
                      Open a saved trail…
                    </option>
                    {trails.map((t, i) => (
                      <option value={i} key={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>
          </section>
        </main>
      </div>
      <footer>
        Compiler evidence, with its limits visible.
        <span>Offline after setup · No compilation while browsing</span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
