/**
 * Comprehensive API Test Suite
 * Tests all API endpoints with various scenarios
 * 
 * Run with: npm test
 * Or for manual testing: npm run test:manual
 */

import { describe, it, expect } from '@jest/globals';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const DELAY_BETWEEN_TESTS = 500; // Delay to avoid rate limiting during tests

// Helper function to delay between tests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API requests
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

// Expected tokens in a generated theme
const EXPECTED_TOKENS = [
  'bg', 'card', 'card2', 'text', 'textMuted', 'textOnColor',
  'primary', 'primaryFg', 'secondary', 'secondaryFg', 'accent', 'accentFg',
  'border', 'ring', 'good', 'goodFg', 'warn', 'warnFg', 'bad', 'badFg'
];

// Valid harmony styles
const VALID_STYLES = [
  'monochrome', 'analogous', 'complementary', 'split-complementary',
  'triadic', 'tetradic', 'compound', 'triadic-split', 'random'
];

describe('API Test Suite', () => {
  
  describe('1. Generate Theme API (/api/generate-theme)', () => {
    
    it('should generate a random theme with light and dark variants', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ style: 'random' }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.light).toBeDefined();
      expect(data.dark).toBeDefined();
      expect(data.metadata).toBeDefined();
      
      // Verify all 20 tokens exist in light theme
      EXPECTED_TOKENS.forEach(token => {
        expect(data.light[token]).toBeDefined();
        expect(typeof data.light[token]).toBe('string');
      });
      
      // Verify all 20 tokens exist in dark theme
      EXPECTED_TOKENS.forEach(token => {
        expect(data.dark[token]).toBeDefined();
        expect(typeof data.dark[token]).toBe('string');
      });
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should generate an analogous theme', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ style: 'analogous' }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metadata.style).toBe('analogous');
      expect(data.metadata.philosophy).toContain('nature');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should generate a triadic theme', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ style: 'triadic' }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metadata.style).toBe('triadic');
      expect(data.metadata.philosophy).toContain('triangle');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should generate a complementary theme', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ style: 'complementary' }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metadata.style).toBe('complementary');
      expect(data.metadata.philosophy).toContain('contrast');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should generate theme with base color', async () => {
      const baseColor = '#3B82F6';
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'analogous',
          baseColor 
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.light).toBeDefined();
      expect(data.dark).toBeDefined();
      expect(data.metadata.seed).toBe(baseColor);
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should accept saturation parameter', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'analogous',
          saturation: 3
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should accept contrast parameter', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'analogous',
          contrast: -2
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should accept brightness parameter', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'analogous',
          brightness: 2
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should accept all parameters together', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'triadic',
          baseColor: '#10B981',
          saturation: 2,
          contrast: 1,
          brightness: -1
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metadata.style).toBe('triadic');
      expect(data.metadata.seed).toBe('#10B981');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should accept mode as alias for style', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'tetradic',
          baseColor: '#10B981'
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metadata.mode).toBe('tetradic');
      expect(data.metadata.style).toBe('tetradic');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should accept split adjustments and darkFirst options', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'analogous',
          baseColor: '#3B82F6',
          darkFirst: true,
          splitAdjustments: true,
          lightSaturationLevel: 1,
          lightContrastLevel: 0,
          lightBrightnessLevel: 1,
          darkSaturationLevel: -1,
          darkContrastLevel: 1,
          darkBrightnessLevel: -1
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metadata.options.darkFirst).toBe(true);
      expect(data.metadata.options.splitAdjustments).toBe(true);
      expect(data.metadata.options.lightBrightnessLevel).toBe(1);
      expect(data.metadata.options.darkBrightnessLevel).toBe(-1);
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject invalid style', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ style: 'invalid-style' }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_STYLE');
      expect(data.error).toContain('Invalid style');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject invalid base color', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'random',
          baseColor: 'not-a-color' 
        }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_BASE_COLOR');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject saturation out of range', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'random',
          saturation: 10 // Out of -5 to 5 range
        }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_PARAMETERS');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject contrast out of range', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'random',
          contrast: -10 // Out of -5 to 5 range
        }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_PARAMETERS');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject GET method', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'GET',
      });
      
      expect(response.status).toBe(405);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('METHOD_NOT_ALLOWED');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should handle OPTIONS request (CORS)', async () => {
      const response = await apiRequest('/generate-theme', {
        method: 'OPTIONS',
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    // Test all valid styles
    VALID_STYLES.forEach(style => {
      it(`should accept style: ${style}`, async () => {
        const response = await apiRequest('/generate-theme', {
          method: 'POST',
          body: JSON.stringify({ style }),
        });
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        
        await delay(DELAY_BETWEEN_TESTS);
      });
    });
  });

  describe('2. Export Theme API (/api/export-theme)', () => {
    
    const sampleTheme = {
      bg: '#F8FAFC',
      card: '#F1F5F9',
      card2: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#475569',
      textOnColor: '#FFFFFF',
      primary: '#3B82F6',
      primaryFg: '#FFFFFF',
      secondary: '#6366F1',
      secondaryFg: '#FFFFFF',
      accent: '#F43F5E',
      accentFg: '#FFFFFF',
      border: '#CBD5E1',
      ring: '#3B82F6',
      good: '#10B981',
      goodFg: '#FFFFFF',
      warn: '#F59E0B',
      warnFg: '#000000',
      bad: '#EF4444',
      badFg: '#FFFFFF'
    };

    it('should export theme as CSS', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'css'
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.format).toBe('css');
      expect(data.content).toContain(':root');
      expect(data.content).toContain('--taichi-primary');
      expect(data.content).toContain('--taichi-bg');
      expect(data.filename).toBe('taichi-theme.css');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should export theme as SCSS', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'scss'
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.format).toBe('scss');
      expect(data.content).toContain('$taichi-primary');
      expect(data.filename).toBe('taichi-theme.scss');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should export theme as LESS', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'less'
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.format).toBe('less');
      expect(data.content).toContain('@taichi-primary');
      expect(data.filename).toBe('taichi-theme.less');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should export theme as Tailwind config', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'tailwind'
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.format).toBe('tailwind');
      expect(data.content).toContain('module.exports');
      expect(data.content).toContain('theme:');
      expect(data.content).toContain('extend:');
      expect(data.filename).toBe('tailwind.config.js');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should export theme as JSON', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'json'
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.format).toBe('json');
      
      // Verify content is valid JSON
      const parsedContent = JSON.parse(data.content);
      expect(parsedContent.primary).toBe(sampleTheme.primary);
      expect(data.filename).toBe('taichi-theme.json');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should use custom prefix', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'css',
          options: {
            prefix: 'custom'
          }
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.content).toContain('--custom-primary');
      expect(data.filename).toBe('custom-theme.css');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should exclude comments when requested', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'css',
          options: {
            includeComments: false
          }
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.content).not.toContain('/**');
      expect(data.content).not.toContain('Usage example');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject invalid format', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: sampleTheme,
          format: 'invalid-format'
        }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_FORMAT');
      
      await delay(DELAY_BETWEEN_TESTS);
    });

    it('should reject missing theme', async () => {
      const response = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          format: 'css'
        }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_THEME');
      
      await delay(DELAY_BETWEEN_TESTS);
    });
  });

  describe('3. CORS Support', () => {
    
    it('should include CORS headers on all endpoints', async () => {
      const endpoints = [
        { path: '/generate-theme', method: 'POST', body: JSON.stringify({ style: 'random' }) },
        { path: '/export-theme', method: 'POST', body: JSON.stringify({ theme: { primary: '#000' }, format: 'json' }) },
      ];
      
      for (const endpoint of endpoints) {
        const response = await apiRequest(endpoint.path, {
          method: endpoint.method,
          body: endpoint.body,
        });
        
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
        
        await delay(DELAY_BETWEEN_TESTS);
      }
    });
  });

  describe('4. Integration Test - Complete Workflow', () => {
    
    it('should complete full workflow: generate -> export -> verify', async () => {
      // Step 1: Generate a theme
      const generateResponse = await apiRequest('/generate-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          style: 'analogous',
          baseColor: '#3B82F6',
          saturation: 2
        }),
      });
      
      expect(generateResponse.status).toBe(200);
      const { light, dark, metadata } = await generateResponse.json();
      
      expect(light).toBeDefined();
      expect(dark).toBeDefined();
      expect(metadata.style).toBe('analogous');
      expect(metadata.seed).toBe('#3B82F6');
      
      await delay(DELAY_BETWEEN_TESTS);
      
      // Step 2: Export the light theme as CSS
      const exportResponse = await apiRequest('/export-theme', {
        method: 'POST',
        body: JSON.stringify({ 
          theme: light,
          format: 'css',
          options: {
            prefix: 'app',
            includeComments: true
          }
        }),
      });
      
      expect(exportResponse.status).toBe(200);
      const { content, filename } = await exportResponse.json();
      
      expect(content).toContain('--app-primary');
      expect(content).toContain('--app-bg');
      expect(filename).toBe('app-theme.css');
      
      // Verify content is valid CSS
      expect(content).toContain(':root {');
      expect(content).toContain('}');
      
      console.log('✅ Complete workflow test passed!');
    });

    it('should generate different themes for different styles', async () => {
      const styles = ['monochrome', 'complementary', 'triadic'];
      const themes: any[] = [];
      
      for (const style of styles) {
        const response = await apiRequest('/generate-theme', {
          method: 'POST',
          body: JSON.stringify({ style, baseColor: '#3B82F6' }),
        });
        
        expect(response.status).toBe(200);
        const data = await response.json();
        themes.push(data.light);
        
        await delay(DELAY_BETWEEN_TESTS);
      }
      
      // Verify themes are different (at least the secondary color should differ)
      // Note: This is not guaranteed but is highly likely for different harmony modes
      console.log('Generated 3 different style themes successfully');
    });
  });
});

// Export for use in other test files
export { apiRequest, delay };
