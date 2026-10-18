import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'kernel-e2e',
  workers: 1,
  timeout: 90000,
  // Real expanded indexes resolve reviewed selectors before restoring the view.
  expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:8766', viewport: { width: 1512, height: 982 } },
  webServer: {
    command: '../.venv/bin/python -m uvicorn explorer.api:app --app-dir .. --host 127.0.0.1 --port 8766',
    env: { KSE_INDEX: process.env.KSE_TEST_INDEX || '../data/learning/index.sqlite' },
    url: 'http://127.0.0.1:8766/api/dataset',
    reuseExistingServer: false,
  },
});
