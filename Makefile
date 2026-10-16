.PHONY: setup indexer fixture web test serve
LLVM_PREFIX ?= /opt/homebrew/opt/llvm
PYTHON ?= python3
setup:
	$(PYTHON) -m venv .venv
	.venv/bin/python -m pip install -r requirements.lock
	.venv/bin/python -m pip install --no-deps -e .
	npm ci --prefix web
indexer:
	cmake -S indexer -B build/indexer -DCMAKE_PREFIX_PATH=$(LLVM_PREFIX) -DCMAKE_BUILD_TYPE=Release
	cmake --build build/indexer -j2
fixture:
	.venv/bin/kse fixture
	.venv/bin/kse index --root fixtures/process --compdb data/fixture-build/compile_commands.json --metadata data/fixture-build/metadata.json --output data/fixture.sqlite --scope 'Process fixture: 3 compiled TUs and 1 skipped TU; not a kernel index' --tu fixtures/process/process.c --tu fixtures/process/other.c --tu fixtures/process/broken.c --tu fixtures/process/skipped.c
web:
	npm run build --prefix web
test:
	.venv/bin/pytest -q
	npm run build --prefix web
	npm run test:e2e --prefix web
serve:
	.venv/bin/uvicorn explorer.api:app --host 127.0.0.1 --port 8000
