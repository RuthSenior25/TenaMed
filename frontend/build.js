import { build } from 'vite';
import { resolve } from 'path';

async function runBuild() {
  try {
    await build({
      configFile: false,
      root: process.cwd(),
      build: {
        outDir: 'dist',
        emptyOutDir: true
      }
    });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

runBuild();