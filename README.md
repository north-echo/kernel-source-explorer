# Linux Kernel Source Explorer

A planned local source explorer for Linux kernel learning and security investigation, inspired by Sourcetrail’s coordinated search, graph, and source views.

## Status

Specification stage. The application and indexer have not been implemented.

Read [the implementation specification](IMPLEMENTATION_SPEC.md) for architecture, scope, milestones, and acceptance criteria.

## Initial baseline

- Linux 7.2.11, pinned to an exact source revision during dataset preparation.
- One architecture and configuration initially.
- Process creation as the first kernel exploration scope.
- C++/Clang indexer, SQLite storage, FastAPI service, React/TypeScript interface.

## Starting implementation with Codex

Open this repository in Codex and ask:

> Read IMPLEMENTATION_SPEC.md and implement the project, beginning with Milestone A. Follow the specification’s working approach, validate each milestone, and report actual results and remaining limitations.

## Project decisions

- Working repository name: `kernel-source-explorer`.
- Fresh implementation; no Sourcetrail code or branding has been copied.
- A project license has not yet been selected.
- Kernel source trees, generated indexes, and build products are not committed.
