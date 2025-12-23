import path from 'path';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const baseCommitCount = (() => {
  try {
    const config = JSON.parse(
      fs.readFileSync(new URL('./version-config.json', import.meta.url), 'utf8')
    );
    return Number(config.baseCommitCount) || 0;
  } catch {
    return 0;
  }
})();

const baseVersion = (() => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')
    );
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

const getCommitCount = () => {
  try {
    const output = execSync('git rev-list --count HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const count = Number(output);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
};

const getAppVersion = () => {
  const [major, minor, patch] = baseVersion.split('.');
  const basePatch = Number(patch) || 0;
  const commitCount = getCommitCount();
  const bump = commitCount === null ? 0 : Math.max(0, commitCount - baseCommitCount);
  return `${Number(major) || 0}.${Number(minor) || 0}.${basePatch + bump}`;
};

const appVersion = getAppVersion();

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __APP_VERSION__: JSON.stringify(appVersion)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
