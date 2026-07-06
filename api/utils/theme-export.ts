/**
 * Shared theme export formatters used by /api/export-theme and /api/mcp.
 */

export const VALID_EXPORT_FORMATS = ['css', 'json', 'tailwind', 'scss', 'less'] as const;
export type ExportFormat = (typeof VALID_EXPORT_FORMATS)[number];

export interface ThemeExportResult {
  content: string;
  filename: string;
}

export function buildThemeExport(
  theme: Record<string, string>,
  format: ExportFormat,
  prefix: string,
  includeComments: boolean
): ThemeExportResult {
  switch (format) {
    case 'css':
      return { content: exportAsCSS(theme, prefix, includeComments), filename: `${prefix}-theme.css` };
    case 'scss':
      return { content: exportAsSCSS(theme, prefix, includeComments), filename: `${prefix}-theme.scss` };
    case 'less':
      return { content: exportAsLESS(theme, prefix, includeComments), filename: `${prefix}-theme.less` };
    case 'tailwind':
      return { content: exportAsTailwind(theme, includeComments), filename: 'tailwind.config.js' };
    case 'json':
    default:
      return { content: JSON.stringify(theme, null, 2), filename: `${prefix}-theme.json` };
  }
}

function toKebab(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function exportAsCSS(theme: Record<string, string>, prefix: string, includeComments: boolean): string {
  const lines: string[] = [];

  if (includeComments) {
    lines.push('/**');
    lines.push(' * Taichi Theme Generator - Theme Export');
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' * Format: CSS Custom Properties');
    lines.push(' */\n');
  }

  lines.push(':root {');
  Object.entries(theme).forEach(([key, value]) => {
    lines.push(`  --${prefix}-${toKebab(key)}: ${value};`);
  });
  lines.push('}\n');

  if (includeComments) {
    lines.push('/* Usage example:');
    lines.push(` * color: var(--${prefix}-primary);`);
    lines.push(' */');
  }

  return lines.join('\n');
}

function exportAsSCSS(theme: Record<string, string>, prefix: string, includeComments: boolean): string {
  const lines: string[] = [];

  if (includeComments) {
    lines.push('//');
    lines.push('// Taichi Theme Generator - Theme Export');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// Format: SCSS Variables');
    lines.push('//\n');
  }

  Object.entries(theme).forEach(([key, value]) => {
    lines.push(`$${prefix}-${toKebab(key)}: ${value};`);
  });

  if (includeComments) {
    lines.push('\n// Usage example:');
    lines.push(`// color: $${prefix}-primary;`);
  }

  return lines.join('\n');
}

function exportAsLESS(theme: Record<string, string>, prefix: string, includeComments: boolean): string {
  const lines: string[] = [];

  if (includeComments) {
    lines.push('//');
    lines.push('// Taichi Theme Generator - Theme Export');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// Format: LESS Variables');
    lines.push('//\n');
  }

  Object.entries(theme).forEach(([key, value]) => {
    lines.push(`@${prefix}-${toKebab(key)}: ${value};`);
  });

  if (includeComments) {
    lines.push('\n// Usage example:');
    lines.push(`// color: @${prefix}-primary;`);
  }

  return lines.join('\n');
}

function exportAsTailwind(theme: Record<string, string>, includeComments: boolean): string {
  const lines: string[] = [];

  if (includeComments) {
    lines.push('/**');
    lines.push(' * Taichi Theme Generator - Theme Export');
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' * Format: Tailwind CSS Configuration');
    lines.push(' */\n');
  }

  lines.push('module.exports = {');
  lines.push('  theme: {');
  lines.push('    extend: {');
  lines.push('      colors: {');
  lines.push('        taichi: {');

  Object.entries(theme).forEach(([key, value], index, array) => {
    const isLast = index === array.length - 1;
    lines.push(`          '${toKebab(key)}': '${value}'${isLast ? '' : ','}`);
  });

  lines.push('        }');
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');

  if (includeComments) {
    lines.push('\n// Usage example:');
    lines.push('// <div className="bg-taichi-primary text-taichi-text">...');
  }

  return lines.join('\n');
}
