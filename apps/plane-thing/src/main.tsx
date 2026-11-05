import { BridgethingClient } from '@bridgething/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Repo } from './data/repo';
import { daemonUrl } from './daemon';
import './index.css';
import { devicePlatform } from './platform/device';
import type { Platform } from './platform/types';
import { webPlatform } from './platform/web';

// on the device the link to the daemon opens a moment after the page does
function opened(client: BridgethingClient, limitMs: number): Promise<void> {
  if (client.connectionState === 'open') return Promise.resolve();
  return new Promise(resolve => {
    const done = () => {
      off();
      clearTimeout(timer);
      resolve();
    };
    const off = client.on(e => e.type === 'open' && done());
    const timer = setTimeout(done, limitMs);
  });
}

async function pickPlatform(): Promise<Platform> {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('sim');
  // ?sim=fixtures runs on made-up aircraft with no network, ?sim=web uses the real services from a normal browser
  if (mode === 'fixtures') {
    const { simPlatform } = await import('./sim/platform');
    return simPlatform(params);
  }
  if (mode === 'web') return webPlatform({ config: Object.fromEntries(params) });
  const client = new BridgethingClient({ url: daemonUrl() });
  await opened(client, 8000);
  return devicePlatform(client);
}

async function boot() {
  const platform = await pickPlatform();
  const repo = new Repo(platform);
  await repo.start();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App repo={repo} />
    </StrictMode>,
  );
}

void boot();
