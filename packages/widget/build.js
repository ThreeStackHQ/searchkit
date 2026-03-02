const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src', 'widget.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'SearchKit',
  outfile: path.join(__dirname, 'dist', 'searchkit.js'),
  platform: 'browser',
  target: ['es2017'],
  sourcemap: false,
}).then(() => {
  console.log('✅ SearchKit widget built → dist/searchkit.js');
}).catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
