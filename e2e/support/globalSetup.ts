import { execSync } from 'node:child_process';

/** Builds the two app versions the update test swaps between, before any browser starts. */
export default function globalSetup(): void {
  for (const build of ['a', 'b']) {
    execSync(`npx vite build --outDir dist-${build} --emptyOutDir --logLevel error`, {
      stdio: 'inherit',
      env: { ...process.env, APP_BUILD: build },
    });
  }
}
