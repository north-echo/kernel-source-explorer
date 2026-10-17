import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { ReaderProfile, ReaderState } from "./learningTypes";
import {
  defaultReader,
  mergeReader,
  parseReader,
  serializeReader,
  READER_KEY,
} from "./readerStorage";
function load() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(READER_KEY);
    return {
      state: raw ? parseReader(raw) : defaultReader(),
      local: !!raw,
      raw: "",
      error: "",
    };
  } catch {
    return {
      state: defaultReader(),
      local: true,
      raw: raw ?? "",
      error:
        "Reading notes could not be read. Automatic saving is paused. Download the original record or import a valid copy before replacing it.",
    };
  }
}
export function useReaderState() {
  const [initial] = useState(load);
  const [reader, setReader] = useState(initial.state);
  const [storageError, setStorageError] = useState(initial.error);
  const [quarantine, setQuarantine] = useState(
    initial.error ? { raw: initial.raw } : null,
  );
  const [dirty, setDirty] = useState(false);
  const readerRef = useRef(reader);
  readerRef.current = reader;
  const changedFields = useRef(new Set<keyof ReaderState>());
  const updateReader = useCallback(
    (update: (old: ReaderState) => ReaderState) => {
      const old = readerRef.current;
      const next = update(old);
      try {
        serializeReader(next);
      } catch (error) {
        setStorageError(
          (error as Error).message +
            " The edit was not accepted; shorten the notes before retrying.",
        );
        return;
      }
      for (const key of [
        "readingLesson",
        "readingReference",
        "interests",
        "studyEnvironment",
        "discussionContext",
        "activeLab",
      ] as const)
        if (next[key] !== old[key]) changedFields.current.add(key);
      readerRef.current = next;
      setReader(next);
      setDirty(true);
    },
    [],
  );
  useEffect(() => {
    if (initial.local) return;
    const controller = new AbortController();
    api<ReaderProfile>("reader-profile", undefined, controller.signal)
      .then((profile) => {
        setReader((old) => {
          const seeded = {
            ...old,
            readingLesson: profile.reading_lesson,
            readingReference: profile.reading_reference,
            interests: profile.interests,
            studyEnvironment: profile.study_environment || "",
            discussionContext: profile.discussion_context || "",
            ...(profile.active_lab ? { activeLab: profile.active_lab } : {}),
          };
          for (const key of changedFields.current)
            Object.assign(seeded, { [key]: old[key] });
          return seeded;
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initial]);
  useEffect(() => {
    if (!dirty || quarantine) return;
    try {
      localStorage.setItem(READER_KEY, serializeReader(reader));
      setStorageError("");
    } catch (error) {
      setStorageError(
        (error as Error).message +
          " Saving failed; the previous stored record is retained. Reduce the notes size or free browser storage, then retry.",
      );
    }
  }, [reader, dirty, quarantine]);
  const replaceRecord = (incoming: ReaderState, mode: "merge" | "replace") => {
    try {
      // Never destroy the previous raw record, including corrupt/unknown-version data.
      const next =
        mode === "merge"
          ? mergeReader(reader, incoming)
          : parseReader(serializeReader(incoming));
      const serialized = serializeReader(next);
      const raw = localStorage.getItem(READER_KEY);
      if (raw !== null)
        localStorage.setItem("kse-reader-backup-" + Date.now(), raw);
      localStorage.setItem(READER_KEY, serialized);
      changedFields.current = new Set([
        "readingLesson",
        "readingReference",
        "interests",
        "studyEnvironment",
        "discussionContext",
        "activeLab",
      ]);
      setReader(next);
      setDirty(false);
      setQuarantine(null);
      setStorageError("");
      return "";
    } catch (error) {
      return (
        (error as Error).message +
        " Recovery was not applied. The existing record is retained; check size/count limits or available browser storage."
      );
    }
  };
  return { reader, updateReader, storageError, quarantine, replaceRecord };
}
