PRAGMA foreign_keys=ON;
PRAGMA user_version=1;
CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE files (path TEXT PRIMARY KEY, sha256 TEXT NOT NULL);
CREATE TABLE translation_units (
 id INTEGER PRIMARY KEY, path TEXT UNIQUE NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('successful','partial','failed','skipped')),
 command_json TEXT, elapsed_seconds REAL NOT NULL, peak_rss_bytes INTEGER, reason TEXT
);
CREATE TABLE diagnostics (id INTEGER PRIMARY KEY, tu_id INTEGER NOT NULL REFERENCES translation_units(id), severity TEXT NOT NULL, message TEXT NOT NULL, file TEXT, line INTEGER, column INTEGER);
CREATE TABLE symbols (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL);
CREATE INDEX symbol_names ON symbols(name COLLATE NOCASE);
CREATE TABLE locations (
 id INTEGER PRIMARY KEY, symbol_id TEXT NOT NULL REFERENCES symbols(id), tu_id INTEGER NOT NULL REFERENCES translation_units(id),
 is_definition INTEGER NOT NULL, file TEXT NOT NULL REFERENCES files(path), line INTEGER NOT NULL, column INTEGER NOT NULL,
 spelling_file TEXT, spelling_line INTEGER, spelling_column INTEGER,
 UNIQUE(symbol_id,tu_id,is_definition,file,line,column)
);
CREATE INDEX symbol_locations ON locations(symbol_id,is_definition);
CREATE TABLE relationships (
 id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES symbols(id), target_id TEXT REFERENCES symbols(id),
 tu_id INTEGER NOT NULL REFERENCES translation_units(id), kind TEXT NOT NULL, resolution TEXT NOT NULL,
 origin TEXT NOT NULL DEFAULT 'clang_ast', file TEXT NOT NULL REFERENCES files(path), line INTEGER NOT NULL, column INTEGER NOT NULL,
 spelling_file TEXT, spelling_line INTEGER, spelling_column INTEGER,
 UNIQUE(source_id,target_id,tu_id,kind,file,line,column)
);
CREATE INDEX edge_source ON relationships(source_id,kind);
CREATE INDEX edge_target ON relationships(target_id,kind);
