// This file is the main entry point that sets up module aliases before the app starts

import path from 'path';
import moduleAlias from 'module-alias';

// Add the current directory to the module path
const baseDir = path.join(__dirname, '..');

// Register module aliases
moduleAlias.addAliases({
  '@': path.join(baseDir, 'src'),
});

// Import the server after setting up aliases
import '@/server';
