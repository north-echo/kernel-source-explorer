# Third-party notices

The MIT license at the repository root applies to this project's original application code, companion explanations and experiment sources. It does not relicense dependencies, Linux source code, or the referenced book.

## Browser dependencies

The built browser application uses:

| Component | License | Retained license |
| --- | --- | --- |
| React 19.2.0 | MIT | [React](third_party/licenses/react.txt) |
| React DOM 19.2.0 | MIT | [React DOM](third_party/licenses/react-dom.txt) |
| Cytoscape.js 3.33.1 | MIT | [Cytoscape.js](third_party/licenses/cytoscape.txt) |
| highlight.js 11.11.1 | BSD-3-Clause | [highlight.js](third_party/licenses/highlight.js.txt) |

Keep these notices when distributing a built browser application. Installed server, development and transitive dependencies retain their own package licenses; the dependency lockfiles record the versions used.

## Compiler and kernel

The native indexer links against Clang/LLVM libraries supplied separately by the build environment. Those libraries retain their Apache-2.0 WITH LLVM-exception licensing and distribution requirements.

Kernel source trees and generated source snapshots are not committed or distributed by this repository. Downloaded Linux code retains its original SPDX identifiers and licenses. The application's MIT license does not apply to kernel text shown by the source reader or in illustrative screenshots. Preserve upstream licensing and provenance if redistributing source snapshots separately.

## Reading references

The Linux Programming Interface, by Michael Kerrisk, is referenced by title and chapter/section. Its PDF, examples and substantial text are not included. This is an independent companion without author or publisher affiliation. Companion explanations and experiment programs were written for this project.

The application was implemented fresh. Sourcetrail served as a design reference for coordinated search, graph and source views; no Sourcetrail code, artwork or branding was copied.
