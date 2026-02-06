/**
 * Project scaffolding logic for create-cliffy
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEMPLATES = ['typescript-vite', 'bun', 'purescript'] as const;
export type Template = typeof TEMPLATES[number];

export interface ScaffoldOptions {
  projectName: string;
  template: Template;
  initGit: boolean;
  installDeps: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

const CLIFFY_VERSION = '0.1.2';

interface TemplateVariables {
  projectName: string;
  cliffyVersion: string;
}

function processTemplate(content: string, variables: TemplateVariables): string {
  return content
    .replace(/\{\{projectName\}\}/g, variables.projectName)
    .replace(/\{\{cliffyVersion\}\}/g, variables.cliffyVersion);
}

function copyTemplateDir(
  templateDir: string,
  targetDir: string,
  variables: TemplateVariables
): void {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const entries = readdirSync(templateDir);

  for (const entry of entries) {
    const srcPath = join(templateDir, entry);
    const stat = statSync(srcPath);

    // Remove .template extension from filename
    const targetName = entry.replace(/\.template$/, '');
    const destPath = join(targetDir, targetName);

    if (stat.isDirectory()) {
      copyTemplateDir(srcPath, destPath, variables);
    } else {
      const content = readFileSync(srcPath, 'utf-8');
      const processed = processTemplate(content, variables);
      writeFileSync(destPath, processed);
    }
  }
}

export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const { projectName, template, initGit, installDeps, packageManager } = options;
  const targetDir = join(process.cwd(), projectName);

  // Check if directory already exists
  if (existsSync(targetDir)) {
    const files = readdirSync(targetDir);
    if (files.length > 0) {
      throw new Error(`Directory "${projectName}" is not empty`);
    }
  }

  console.log(`\n${pc.cyan('Creating project')} ${pc.bold(projectName)}...`);
  console.log(`  Template: ${pc.yellow(template)}`);
  console.log();

  // Create project directory
  mkdirSync(targetDir, { recursive: true });

  // Copy template files
  const templateDir = join(__dirname, 'templates', template);
  const variables: TemplateVariables = {
    projectName,
    cliffyVersion: CLIFFY_VERSION,
  };

  copyTemplateDir(templateDir, targetDir, variables);

  console.log(pc.green('  Created project files'));

  // Initialize git
  // Note: execSync is used here with hardcoded commands only (no user input)
  if (initGit) {
    try {
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      writeFileSync(
        join(targetDir, '.gitignore'),
        getGitignore(template)
      );
      console.log(pc.green('  Initialized git repository'));
    } catch {
      console.log(pc.yellow('  Skipped git init (git not available)'));
    }
  }

  // Install dependencies
  // Note: execSync is used here with hardcoded commands only (no user input)
  if (installDeps) {
    console.log(`\n${pc.cyan('Installing dependencies')} with ${packageManager}...`);
    try {
      const installCmd = getInstallCommand(packageManager);
      execSync(installCmd, { cwd: targetDir, stdio: 'inherit' });
      console.log(pc.green('\n  Dependencies installed'));
    } catch {
      console.log(pc.yellow('\n  Failed to install dependencies'));
      console.log(`  Run ${pc.cyan(`${packageManager} install`)} manually`);
    }
  }

  // Print next steps
  console.log();
  console.log(pc.bold('Done! Next steps:'));
  console.log();
  console.log(`  ${pc.cyan('cd')} ${projectName}`);

  if (!installDeps) {
    console.log(`  ${pc.cyan(getInstallCommand(packageManager))}`);
  }

  if (template === 'purescript') {
    console.log(`  ${pc.cyan('spago build')}`);
  }

  console.log(`  ${pc.cyan(getDevCommand(packageManager))}`);
  console.log();
  console.log(pc.dim('Happy hacking!'));
  console.log();
}

function getInstallCommand(pm: string): string {
  switch (pm) {
    case 'yarn':
      return 'yarn';
    case 'pnpm':
      return 'pnpm install';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install';
  }
}

function getDevCommand(pm: string): string {
  const runCmd = pm === 'npm' ? 'npm run' : pm;
  return `${runCmd} dev`;
}

function getGitignore(template: Template): string {
  const common = `# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
.output/
output/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;

  const templateSpecific: Record<Template, string> = {
    'typescript-vite': `
# Vite
*.local
`,
    'bun': `
# Bun
bun.lockb
`,
    'purescript': `
# PureScript
.spago/
.psci_modules/
.psc-package/
`,
  };

  return common + (templateSpecific[template] || '');
}
