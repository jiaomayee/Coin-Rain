const { spawn } = require('child_process');
const path = require('path');

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

const executable = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
const child = spawn(executable, [__dirname], {
  cwd: __dirname,
  env: env,
  stdio: 'inherit'
});

child.on('error', (err) => {
  console.error('Failed to start Electron: ' + err.message);
  process.exit(1);
});

child.on('exit', (code) => process.exit(code == null ? 0 : code));
