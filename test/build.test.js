/**
 * Minimal smoke test - verifies the build completes successfully
 * Run with: npm test
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running ClipForge Build Smoke Test...\n');

try {
  // Check that build artifacts exist
  const distRenderer = path.join(__dirname, '../dist/renderer');
  const distMain = path.join(__dirname, '../dist/main');

  if (!fs.existsSync(distRenderer)) {
    throw new Error('Renderer build output not found at dist/renderer');
  }

  if (!fs.existsSync(distMain)) {
    throw new Error('Main process build output not found at dist/main');
  }

  // Check for key files
  const indexHtml = path.join(distRenderer, 'index.html');
  const mainJs = path.join(distMain, 'index.js');

  if (!fs.existsSync(indexHtml)) {
    throw new Error('index.html not found in renderer build');
  }

  if (!fs.existsSync(mainJs)) {
    throw new Error('index.js not found in main build');
  }

  console.log('✅ Build artifacts verified');
  console.log('  ✓ dist/renderer/index.html');
  console.log('  ✓ dist/main/index.js');
  console.log('\n✅ All smoke tests passed!\n');

  process.exit(0);
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
