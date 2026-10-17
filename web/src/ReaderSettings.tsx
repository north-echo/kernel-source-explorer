import { useState } from "react";
import type { ReaderState } from "./learningTypes";
import {
  defaultReader,
  downloadRecord,
  parseReader,
  serializeReader,
  READER_MAX_BYTES,
} from "./readerStorage";
export type RecoveryProps = {
  quarantine: { raw: string } | null;
  replaceRecord: (incoming: ReaderState, mode: "merge" | "replace") => string;
};
export function ReaderSettings({
  reader,
  updateReader,
  quarantine,
  replaceRecord,
}: {
  reader: ReaderState;
  updateReader: (fn: (old: ReaderState) => ReaderState) => void;
} & RecoveryProps) {
  const [preview, setPreview] = useState<ReaderState>();
  const [error, setError] = useState("");
  const [backups, setBackups] = useState<string[]>([]);
  function listBackups() {
    try {
      setBackups(
        Object.keys(localStorage)
          .filter((k) => k.startsWith("kse-reader-backup-"))
          .sort()
          .reverse(),
      );
    } catch {
      setError(
        "Browser backups cannot be read; keep exported files for recovery.",
      );
    }
  }
  function apply(mode: "merge" | "replace") {
    if (!preview) return;
    const result = replaceRecord(preview, mode);
    setError(result);
    if (!result) {
      setPreview(undefined);
      listBackups();
    }
  }
  return (
    <details className="reader-settings" open={quarantine ? true : undefined}>
      <summary>Your reading place and notes</summary>
      {quarantine && (
        <div role="alert">
          <p>
            Saving is paused to protect the unreadable record. Browsing cannot
            overwrite it.
          </p>
          <button
            onClick={() =>
              downloadRecord(quarantine.raw, "reader-recovery-original.json")
            }
          >
            Download original record
          </button>
          <button
            onClick={() => {
              setPreview(defaultReader());
              setError("");
            }}
          >
            Preview a fresh start
          </button>
        </div>
      )}
      <label>
        Where I’m reading
        <input
          value={reader.readingReference}
          maxLength={200}
          onChange={(e) =>
            updateReader((old) => ({
              ...old,
              readingReference: e.target.value,
            }))
          }
        />
      </label>
      <label>
        Topics I care about
        <input
          value={reader.interests.join(", ")}
          maxLength={500}
          onChange={(e) =>
            updateReader((old) => ({
              ...old,
              interests: e.target.value
                .split(",")
                .map((x) => x.trim().slice(0, 80))
                .filter(Boolean)
                .slice(0, 8),
            }))
          }
        />
      </label>
      <label>
        My Linux environment
        <input
          value={reader.studyEnvironment}
          maxLength={200}
          onChange={(e) =>
            updateReader((old) => ({
              ...old,
              studyEnvironment: e.target.value,
            }))
          }
        />
      </label>
      <button
        onClick={() => {
          try {
            downloadRecord(
              serializeReader(reader),
              "my-kernel-reading-notes.json",
            );
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Export my private notes
      </button>
      <label>
        Import a notes file
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setPreview(undefined);
            setError("");
            try {
              if (!file) return;
              if (file.size > READER_MAX_BYTES)
                throw new Error(
                  "Choose a notes file of at most 2 MiB in UTF-8 bytes.",
                );
              setPreview(parseReader(await file.text()));
            } catch (error) {
              setError((error as Error).message);
            } finally {
              e.target.value = "";
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="import-preview" aria-label="Import preview">
          <h3>Review before importing</h3>
          <p>Book: {preview.readingReference}</p>
          <p>
            Saved lab:{" "}
            {preview.activeLab
              ? `${preview.activeLab.lesson} / ${preview.activeLab.segment}`
              : "None selected"}
          </p>
          <p>
            Last source: {preview.lastExploration?.label || "None retained"}
          </p>
          <p>
            {Object.keys(preview.notes).filter((id) => reader.notes[id]).length}{" "}
            topics overlap current notes.
          </p>
          <p>
            {Object.keys(preview.notes).length} topic notes;{" "}
            {
              Object.values(preview.notes).filter((n) => n.experiment === "ran")
                .length
            }{" "}
            self-reported runs.
          </p>
          <p>
            Merge keeps other current topics; matching topics and positions use
            the imported values. Replace uses only the imported record. A raw
            backup of the previous record is retained in this browser before
            either action.
          </p>
          <button
            onClick={() =>
              downloadRecord(
                quarantine?.raw ?? serializeReader(reader),
                "reader-before-import.json",
              )
            }
          >
            Download current backup
          </button>
          <button onClick={() => apply("merge")}>Merge imported notes</button>
          <button onClick={() => apply("replace")}>Replace with preview</button>
          <button onClick={() => setPreview(undefined)}>Cancel import</button>
        </section>
      )}
      <details>
        <summary onClick={listBackups}>Retained browser backups</summary>
        <p>
          These raw records remain local. Download a backup even if its version
          cannot be imported.
        </p>
        {backups.map((key) => (
          <div key={key}>
            <span>{new Date(Number(key.slice(18))).toLocaleString()}</span>
            <button
              onClick={() =>
                downloadRecord(localStorage.getItem(key) || "", key + ".json")
              }
            >
              Download raw backup
            </button>
            <button
              onClick={() => {
                try {
                  setPreview(parseReader(localStorage.getItem(key) || ""));
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Preview backup recovery
            </button>
          </div>
        ))}
      </details>
      <p>
        Notes stay in this browser and origin. localhost and 127.0.0.1 have
        separate storage, as do different browsers. Export and import to move
        your notes. No experiment is marked run by importing an expected result.
      </p>
    </details>
  );
}
