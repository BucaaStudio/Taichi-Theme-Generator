/**
 * MCP endpoint tests
 *
 * Wraps the /api/mcp handler in a real HTTP server (no vercel dev needed)
 * and speaks stateless streamable-HTTP JSON-RPC to it.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import handler from '../api/mcp';

let server: Server;
let baseUrl: string;

function vercelify(req: IncomingMessage, res: ServerResponse, body: unknown) {
  const anyReq = req as any;
  const anyRes = res as any;
  anyReq.body = body;
  anyRes.status = (code: number) => {
    res.statusCode = code;
    return anyRes;
  };
  anyRes.json = (obj: unknown) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return anyRes;
  };
  return { req: anyReq, res: anyRes };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      let body: unknown;
      try {
        body = data ? JSON.parse(data) : undefined;
      } catch {
        body = undefined;
      }
      const wrapped = vercelify(req, res, body);
      void handler(wrapped.req, wrapped.res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api/mcp`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

let nextId = 1;

async function rpc(method: string, params?: unknown): Promise<any> {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.jsonrpc).toBe('2.0');
  return payload;
}

describe('MCP endpoint (/api/mcp)', () => {
  it('answers initialize with server info and tool capability', async () => {
    const payload = await rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'jest', version: '1.0.0' },
    });
    expect(payload.result.serverInfo.name).toBe('taichi-theme-generator');
    expect(payload.result.capabilities.tools).toBeDefined();
  });

  it('lists the generate, prompt and export tools', async () => {
    const payload = await rpc('tools/list');
    const names = payload.result.tools.map((t: any) => t.name).sort();
    expect(names).toEqual(['export_theme', 'generate_theme', 'generate_theme_from_prompt']);
    for (const tool of payload.result.tools) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('generates a seeded theme with all 20 tokens per mode', async () => {
    const payload = await rpc('tools/call', {
      name: 'generate_theme',
      arguments: { style: 'triadic', baseColor: '#3B82F6' },
    });
    expect(payload.result.isError).toBeFalsy();
    const structured = payload.result.structuredContent;
    expect(structured.style).toBe('triadic');
    expect(structured.seed).toBe('#3B82F6');
    for (const side of ['light', 'dark'] as const) {
      expect(Object.keys(structured[side])).toHaveLength(20);
      for (const value of Object.values(structured[side])) {
        expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('is deterministic for the same seed', async () => {
    const call = () =>
      rpc('tools/call', {
        name: 'generate_theme',
        arguments: { style: 'analogous', baseColor: '#AA3366' },
      });
    const [a, b] = await Promise.all([call(), call()]);
    expect(a.result.structuredContent).toEqual(b.result.structuredContent);
  });

  it('rejects an invalid base color', async () => {
    const payload = await rpc('tools/call', {
      name: 'generate_theme',
      arguments: { baseColor: 'not-a-color' },
    });
    // Zod validation failure surfaces as an isError tool result
    expect(payload.result.isError).toBe(true);
    expect(payload.result.content[0].text).toContain('Input validation error');
  });

  it('exports a theme as CSS custom properties', async () => {
    const generated = await rpc('tools/call', {
      name: 'generate_theme',
      arguments: { style: 'monochrome', baseColor: '#3B82F6' },
    });
    const light = generated.result.structuredContent.light;

    const payload = await rpc('tools/call', {
      name: 'export_theme',
      arguments: { theme: light, format: 'css', prefix: 'app', includeComments: false },
    });
    expect(payload.result.isError).toBeFalsy();
    const structured = payload.result.structuredContent;
    expect(structured.filename).toBe('app-theme.css');
    expect(structured.content).toContain(':root {');
    expect(structured.content).toContain('--app-primary:');
    expect(structured.content).not.toContain('/*');
  });

  it('rejects non-POST requests with 405', async () => {
    const response = await fetch(baseUrl, { method: 'GET' });
    expect(response.status).toBe(405);
    const payload = await response.json();
    expect(payload.error.code).toBe(-32000);
  });

  it('accepts clients that only send Accept: application/json', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method: 'tools/list' }),
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.result.tools.length).toBe(3);
  });
});
