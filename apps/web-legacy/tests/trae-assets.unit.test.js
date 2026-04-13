const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => process.stdout.write(`PASS ${name}\n`),
        (error) => {
          process.stderr.write(`FAIL ${name}\n`);
          process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
          process.exitCode = 1;
        }
      );
    }
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`);
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}

const projectRoot = path.resolve(__dirname, '..', '..', '..');

runTest('Trae 资产文件应存在', () => {
  const requiredFiles = [
    'AGENTS.md',
    '.trae/rules/web-new-cross-platform-guidelines.md',
    '.trae/rules/agent-orchestration.md',
    '.trae/rules/project_rules.md',
    '.trae/skills/executing-plans/SKILL.md',
    '.trae/skills/dispatching-parallel-agents/SKILL.md',
    '.trae/skills/root-cause-tracing/SKILL.md',
    '.trae/skills/cross-platform-readiness-review/SKILL.md',
    '.trae/skills/domain-contract-extraction/SKILL.md',
    '.trae/skills/sync-and-hydration-design/SKILL.md'
  ];

  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    assert.ok(fs.existsSync(absolutePath), `${relativePath} is missing`);
  }
});

runTest('新增 Skill 文件应包含 frontmatter 名称与描述', () => {
  const skillPaths = [
    '.trae/skills/executing-plans/SKILL.md',
    '.trae/skills/dispatching-parallel-agents/SKILL.md',
    '.trae/skills/root-cause-tracing/SKILL.md',
    '.trae/skills/cross-platform-readiness-review/SKILL.md',
    '.trae/skills/domain-contract-extraction/SKILL.md',
    '.trae/skills/sync-and-hydration-design/SKILL.md'
  ];

  for (const relativePath of skillPaths) {
    const content = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    assert.ok(content.startsWith('---\n'), `${relativePath} must start with frontmatter`);
    assert.ok(/\nname:\s*".+?"/.test(content), `${relativePath} missing name`);
    assert.ok(/\ndescription:\s*".+?"/.test(content), `${relativePath} missing description`);
  }
});

runTest('新增规则文件应声明 Trae frontmatter', () => {
  const rulePaths = [
    '.trae/rules/web-new-cross-platform-guidelines.md',
    '.trae/rules/agent-orchestration.md',
    '.trae/rules/project_rules.md'
  ];

  for (const relativePath of rulePaths) {
    const content = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    assert.ok(content.startsWith('---\n'), `${relativePath} must start with frontmatter`);
    assert.ok(/\nalwaysApply:\s*(true|false)/.test(content), `${relativePath} missing alwaysApply`);
  }
});
