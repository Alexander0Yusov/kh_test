import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertCurrentSha,
  hasSuccessfulRunForSha,
  isAuthorizedAssociation,
  parseDeploymentCommand,
  parseDispatch,
  resolvePullRequestSha,
} from './deployment-request.mjs';

for (const target of ['frontend', 'gateway', 'file-service', 'post-service', 'backend', 'all']) {
  assert.deepEqual(parseDeploymentCommand(`/deploy production ${target}`), { target, frontendPr: null });
  assert.deepEqual(parseDispatch(target), { target, frontendPr: null });
}
assert.deepEqual(parseDeploymentCommand('/deploy production frontend frontend-pr=12'), { target: 'frontend', frontendPr: 12 });
assert.deepEqual(parseDeploymentCommand('/deploy production all frontend-pr=7'), { target: 'all', frontendPr: 7 });

for (const command of [
  '/deploy production',
  '/deploy production typo',
  '/deploy production all extra',
  '/deploy production gateway frontend-pr=1',
  '/deploy production frontend frontend-pr=0',
  '/deploy production frontend sha=0123456789012345678901234567890123456789',
  ' /deploy production all',
]) {
  assert.throws(() => parseDeploymentCommand(command));
}
assert.throws(() => parseDispatch('gateway', '2'));
assert.throws(() => parseDispatch('all', 'abc'));

const repository = { full_name: 'owner/backend' };
const openPull = {
  state: 'open',
  head: { sha: 'a'.repeat(40), repo: { fork: false, full_name: repository.full_name } },
  base: { repo: repository },
};
const mergedPull = {
  ...openPull,
  state: 'closed',
  merged_at: '2026-08-03T00:00:00Z',
  merge_commit_sha: 'b'.repeat(40),
};
assert.deepEqual(resolvePullRequestSha(openPull), { sha: 'a'.repeat(40), sourceState: 'candidate' });
assert.deepEqual(resolvePullRequestSha(mergedPull), { sha: 'b'.repeat(40), sourceState: 'merged' });
assert.throws(() => resolvePullRequestSha({ ...openPull, head: { ...openPull.head, repo: { fork: true, full_name: 'fork/backend' } } }));
assert.throws(() => assertCurrentSha('a'.repeat(40), 'b'.repeat(40)));
assert.equal(hasSuccessfulRunForSha([{ head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'success' }], 'a'.repeat(40)), true);
assert.equal(hasSuccessfulRunForSha([{ head_sha: 'a'.repeat(40), status: 'completed', conclusion: 'failure' }], 'a'.repeat(40)), false);
assert.equal(isAuthorizedAssociation('OWNER'), true);
assert.equal(isAuthorizedAssociation('CONTRIBUTOR'), false);

const deployScript = readFileSync(new URL('./deploy-production.sh', import.meta.url), 'utf8');
for (const fixture of [
  "frontend) app_services='frontend'; migration_services=''",
  "gateway) app_services='gateway'; migration_services='gateway-migrations'",
  "file-service) app_services='file-service'; migration_services='file-migrations'",
  "post-service) app_services='post-service'; migration_services='post-migrations'",
  "backend) app_services='gateway file-service post-service'; migration_services='gateway-migrations file-migrations post-migrations'",
  "all) app_services='reverse-proxy frontend gateway file-service post-service'; migration_services='gateway-migrations file-migrations post-migrations'",
  'up -d --no-deps --wait $app_services',
]) {
  assert.ok(deployScript.includes(fixture), `Missing granular deployment fixture: ${fixture}`);
}
const workflow = readFileSync(new URL('../.github/workflows/deploy-production.yaml', import.meta.url), 'utf8');
assert.ok(workflow.includes('ref: ${{ github.event.repository.default_branch }}'));
assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
assert.equal(workflow.includes('ref: ${{ needs.authorize.outputs.backend_sha }}'), false);
assert.ok(workflow.includes('environment: production'));

console.log('Deployment request policy fixtures passed.');
