"""Read-only loopback service; run with KSE_INDEX=/absolute/index.sqlite."""
from contextlib import closing, contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import sqlite3

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware


def create_app(index_path: Path | None = None, web_root: Path | None = None):
    index_path = (index_path or Path(os.environ.get('KSE_INDEX', 'data/fixture.sqlite'))).resolve()
    app = FastAPI(title='Kernel Source Explorer', docs_url=None, redoc_url=None)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost', '127.0.0.1', '[::1]'])
    allowed_origins = {'http://127.0.0.1:8000', 'http://localhost:8000', 'http://127.0.0.1:5173', 'http://localhost:5173'}

    @app.middleware('http')
    async def local_boundary(request: Request, call_next):
        origin = request.headers.get('origin')
        if origin and origin not in allowed_origins:
            from fastapi.responses import JSONResponse
            return JSONResponse({'detail': 'Browser origin is not allowed'}, status_code=403)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"
        response.headers['Cache-Control'] = 'no-store'
        return response

    @contextmanager
    def connection(request: Request):
        if not index_path.is_file():
            raise HTTPException(503, 'No index available. Run the explicit indexing CLI first.')
        with closing(sqlite3.connect(index_path.as_uri() + '?mode=ro', uri=True)) as db:
            db.row_factory = sqlite3.Row
            db.execute('BEGIN')
            if db.execute('PRAGMA user_version').fetchone()[0] != 1:
                raise HTTPException(409, 'Unsupported index schema; rebuild the dataset')
            metadata = dict((row['key'], json.loads(row['value'])) for row in db.execute('SELECT * FROM metadata'))
            expected = request.headers.get('x-kse-dataset')
            if expected and expected != metadata['dataset_id']:
                raise HTTPException(409, 'Dataset changed; reload before continuing navigation')
            yield db, metadata

    def rows(db, sql, params=()):
        return [dict(row) for row in db.execute(sql, params)]

    @app.get('/api/dataset')
    def dataset(request: Request):
        with connection(request) as (db, metadata):
            return dict(metadata=metadata,
                        coverage=rows(db, 'SELECT id,path,status,elapsed_seconds,peak_rss_bytes,reason FROM translation_units ORDER BY id'),
                        diagnostics=rows(db, 'SELECT * FROM diagnostics ORDER BY id LIMIT 200'),
                        diagnostic_count=db.execute('SELECT count(*) FROM diagnostics').fetchone()[0],
                        symbol_count=db.execute('SELECT count(*) FROM symbols').fetchone()[0],
                        relationship_count=db.execute('SELECT count(*) FROM relationships').fetchone()[0])

    @app.get('/api/symbols')
    def search(request: Request, q: str = Query('', max_length=200), path: str = Query('', max_length=500),
               limit: int = Query(40, ge=1, le=100), offset: int = Query(0, ge=0, le=100000)):
        # instr treats wildcard characters literally; all values are parameters.
        with connection(request) as (db, _):
            return rows(db, '''SELECT s.*, l.file,l.line,l.column,l.is_definition,t.status
                FROM symbols s JOIN locations l ON l.id=(
                  SELECT l2.id FROM locations l2 JOIN translation_units t2 ON t2.id=l2.tu_id
                  WHERE l2.symbol_id=s.id AND instr(l2.file,?)>0
                  ORDER BY l2.is_definition DESC, (t2.status='successful') DESC, l2.id LIMIT 1)
                JOIN translation_units t ON t.id=l.tu_id
                WHERE instr(lower(s.name),lower(?))>0 ORDER BY (s.name=?) DESC,s.name,s.id LIMIT ? OFFSET ?''',
                        (path, q, q, limit, offset))

    @app.get('/api/symbol')
    def symbol(request: Request, id: str = Query(max_length=4000)):
        with connection(request) as (db, _):
            found = db.execute('SELECT * FROM symbols WHERE id=?', (id,)).fetchone()
            if not found:
                raise HTTPException(404, 'Symbol is not in this dataset')
            return dict(symbol=dict(found), locations=rows(db, '''SELECT l.*,t.path AS tu,t.status FROM locations l
                JOIN translation_units t ON t.id=l.tu_id WHERE symbol_id=?
                ORDER BY is_definition DESC,(t.status='successful') DESC,l.id LIMIT 200''', (id,)))

    @app.get('/api/neighborhood')
    def neighborhood(request: Request, id: str = Query(max_length=4000),
                     direction: str = Query('both', pattern='^(both|incoming|outgoing)$'),
                     kind: str = Query('all', pattern='^(all|direct_call|indirect_call|reference|declared_type)$'),
                     limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0, le=100000)):
        with connection(request) as (db, _):
            if not db.execute('SELECT 1 FROM symbols WHERE id=?', (id,)).fetchone():
                raise HTTPException(404, 'Symbol is not in this dataset')
            condition = {'both': '(r.source_id=? OR r.target_id=?)', 'incoming': 'r.target_id=?', 'outgoing': 'r.source_id=?'}[direction]
            values = [id, id] if direction == 'both' else [id]
            if kind != 'all':
                condition += ' AND r.kind=?'
                values.append(kind)
            total = db.execute('SELECT count(*) FROM relationships r WHERE ' + condition, values).fetchone()[0]
            edges = rows(db, '''SELECT r.*,s.name AS source_name,t.name AS target_name,u.path AS tu,u.status
                FROM relationships r JOIN symbols s ON s.id=r.source_id LEFT JOIN symbols t ON t.id=r.target_id
                JOIN translation_units u ON u.id=r.tu_id WHERE ''' + condition + ' ORDER BY r.id LIMIT ? OFFSET ?',
                         (*values, limit, offset))
            ids = sorted({value for edge in edges for value in (edge['source_id'], edge['target_id']) if value})
            nodes = rows(db, 'SELECT * FROM symbols WHERE id IN (' + ','.join('?' for _ in ids) + ')', ids) if ids else []
            return dict(edges=edges, nodes=nodes, total=total, offset=offset, limit=limit,
                        next_offset=offset + limit if offset + limit < total else None)

    @app.get('/api/source')
    def source(request: Request, file: str = Query(max_length=2000), line: int = Query(1, ge=1),
               before: int = Query(12, ge=0, le=100), after: int = Query(30, ge=0, le=200)):
        path = PurePosixPath(file)
        if path.is_absolute() or '..' in path.parts or '\\' in file or not path.parts:
            raise HTTPException(403, 'Source path must be relative to the registered dataset root')
        with connection(request) as (db, metadata):
            registered = db.execute('SELECT sha256 FROM files WHERE path=?', (file,)).fetchone()
            if not registered:
                raise HTTPException(404, 'File is not recorded in this index')
            # Walk with dir-relative opens: reject symlinks in every component, including a raced replacement.
            directory = None
            fd = None
            try:
                directory = os.open(metadata['root'], os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
                for part in path.parts[:-1]:
                    child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
                    os.close(directory)
                    directory = child
                fd = os.open(path.parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
                import stat
                if not stat.S_ISREG(os.fstat(fd).st_mode):
                    raise HTTPException(403, 'Source must be a regular file')
                with os.fdopen(fd, 'rb') as handle:
                    fd = None
                    data = handle.read(8 * 1024 * 1024 + 1)
                if len(data) > 8 * 1024 * 1024:
                    raise HTTPException(413, 'Source file exceeds the 8 MiB read limit')
            except OSError:
                raise HTTPException(403, 'Source is missing or contains a symlink; restore the indexed tree') from None
            finally:
                if fd is not None:
                    os.close(fd)
                if directory is not None:
                    os.close(directory)
            if hashlib.sha256(data).hexdigest() != registered['sha256']:
                raise HTTPException(409, 'Source changed since indexing; rebuild the dataset')
            lines = data.decode('utf-8', errors='replace').splitlines()
            if line > len(lines):
                raise HTTPException(416, 'Line is outside this source file')
            start = max(1, line - before)
            return dict(file=file, start=start, line=line, total_lines=len(lines), lines=lines[start-1:line+after])

    web_root = web_root or Path(__file__).resolve().parents[1] / 'web' / 'dist'
    if web_root.is_dir():
        app.mount('/assets', StaticFiles(directory=web_root / 'assets'), name='assets')

        @app.get('/')
        def homepage():
            return FileResponse(web_root / 'index.html')
    return app


app = create_app()
