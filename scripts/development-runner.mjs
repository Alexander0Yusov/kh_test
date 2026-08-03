import { spawn } from 'node:child_process';

const DEVELOPMENT_ENVIRONMENT = {
  ...process.env,
  NODE_ENV: 'development',
};

const SERVICES = [
  { name: 'gateway', script: 'start:gateway' },
  { name: 'files', script: 'start:file' },
  { name: 'posts', script: 'start:post' },
];

const MIGRATIONS = [
  { name: 'gateway', script: 'prisma:migrate:deploy:gateway' },
  { name: 'files', script: 'prisma:migrate:deploy:file' },
  { name: 'posts', script: 'prisma:migrate:deploy:post' },
];

function resolvePnpmCommand(args) {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...args],
    };
  }

  return {
    command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    args,
  };
}

function runPnpmScript(script, options = {}) {
  const command = resolvePnpmCommand([script]);
  return spawn(command.command, command.args, {
    ...options,
    env: DEVELOPMENT_ENVIRONMENT,
    shell: false,
  });
}

function prefixStream(stream, prefix, destination) {
  let remainder = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const lines = `${remainder}${chunk}`.split(/\r?\n/);
    remainder = lines.pop() ?? '';
    for (const line of lines) {
      destination.write(`[${prefix}] ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (remainder) {
      destination.write(`[${prefix}] ${remainder}\n`);
    }
  });
}

async function runMigrations() {
  for (const migration of MIGRATIONS) {
    process.stdout.write(`[migrate:${migration.name}] applying committed migrations\n`);
    const child = runPnpmScript(migration.script, { stdio: 'inherit' });
    const exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        resolve(code ?? (signal ? 1 : 0));
      });
    });
    if (exitCode !== 0) {
      throw new Error(`${migration.name} migrate deploy failed with exit code ${exitCode}.`);
    }
  }
}

function terminateProcessTree(child) {
  if (!child.pid || child.exitCode !== null) {
    return;
  }
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function runServices() {
  const children = new Map();
  let stopping = false;

  const stopAll = (exitCode) => {
    if (stopping) {
      return;
    }
    stopping = true;
    for (const child of children.values()) {
      terminateProcessTree(child);
    }
    process.exitCode = exitCode;
  };

  process.once('SIGINT', () => stopAll(130));
  process.once('SIGTERM', () => stopAll(143));

  for (const service of SERVICES) {
    const child = runPnpmScript(service.script, {
      detached: process.platform !== 'win32',
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true,
    });
    children.set(service.name, child);
    prefixStream(child.stdout, service.name, process.stdout);
    prefixStream(child.stderr, service.name, process.stderr);
    child.once('error', (error) => {
      process.stderr.write(`[${service.name}] failed to start: ${error.message}\n`);
      stopAll(1);
    });
    child.once('exit', (code, signal) => {
      if (stopping) {
        return;
      }
      process.stderr.write(
        `[${service.name}] exited unexpectedly (${signal ?? code ?? 'unknown'}); stopping required services.\n`,
      );
      stopAll(code && code > 0 ? code : 1);
    });
  }
}

const mode = process.argv[2];
if (mode === 'migrate') {
  runMigrations().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Development migration failed.'}\n`);
    process.exitCode = 1;
  });
} else if (mode === 'services') {
  runServices();
} else {
  process.stderr.write('Usage: node scripts/development-runner.mjs <migrate|services>\n');
  process.exitCode = 2;
}
