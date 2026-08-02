const TARGETS = new Set([
  'frontend',
  'gateway',
  'file-service',
  'post-service',
  'backend',
  'all',
]);

const ALLOWED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const COMMAND_PATTERN = /^\/deploy production (frontend|gateway|file-service|post-service|backend|all)(?: frontend-pr=([1-9][0-9]*))?$/;

export function parseDeploymentCommand(body) {
  const match = COMMAND_PATTERN.exec(body);
  if (!match) {
    throw new Error('Unsupported deployment command.');
  }

  const target = match[1];
  const frontendPr = match[2] ? Number(match[2]) : null;
  if (frontendPr !== null && target !== 'frontend' && target !== 'all') {
    throw new Error('frontend-pr is valid only for frontend or all.');
  }

  return { target, frontendPr };
}

export function parseDispatch(target, frontendPrValue = '') {
  if (!TARGETS.has(target)) {
    throw new Error('Unsupported deployment target.');
  }

  const value = frontendPrValue.trim();
  if (value === '') {
    return { target, frontendPr: null };
  }
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error('frontend PR must be a positive integer.');
  }
  if (target !== 'frontend' && target !== 'all') {
    throw new Error('frontend PR is valid only for frontend or all.');
  }

  return { target, frontendPr: Number(value) };
}

export function resolvePullRequestSha(pull) {
  if (pull.head?.repo?.fork || pull.head?.repo?.full_name !== pull.base?.repo?.full_name) {
    throw new Error('Fork pull requests cannot be deployed.');
  }
  if (pull.state === 'open' && /^[0-9a-f]{40}$/.test(pull.head.sha)) {
    return { sha: pull.head.sha, sourceState: 'candidate' };
  }
  if (pull.state === 'closed' && pull.merged_at && /^[0-9a-f]{40}$/.test(pull.merge_commit_sha ?? '')) {
    return { sha: pull.merge_commit_sha, sourceState: 'merged' };
  }
  throw new Error('Pull request must be open or merged with a resolvable SHA.');
}

export function isAuthorizedAssociation(association) {
  return ALLOWED_ASSOCIATIONS.has(association);
}

export function assertCurrentSha(expected, actual) {
  if (expected !== actual) {
    throw new Error('Pull request SHA changed after validation; submit a new deployment request.');
  }
}

export function hasSuccessfulRunForSha(runs, sha) {
  return runs.some((run) => run.head_sha === sha && run.status === 'completed' && run.conclusion === 'success');
}
