import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,

  // Reporters:
  // - 'list' → mostra o progresso no terminal (bom quando corres via Docker)
  // - 'html' → gera um relatório bonito com screenshots e traces quando há falhas
  reporter: [
    ['list'],
    ['html', { open: 'never' }],   // nunca abre automaticamente (porque estamos no Docker)
  ],

  // Onde o Playwright guarda screenshots, vídeos e traces quando um teste falha
  outputDir: 'test-results/',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});