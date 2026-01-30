#!/usr/bin/env node
/**
 * create-cliffy - CLI scaffolding tool for Cliffy projects
 *
 * Usage:
 *   npx create-cliffy my-app
 *   npx create-cliffy my-app --template typescript-vite
 *   npx create-cliffy my-app --template bun
 *   npx create-cliffy my-app --template purescript
 */

import { Command } from 'commander';
import prompts from 'prompts';
import pc from 'picocolors';
import { scaffold, type ScaffoldOptions, TEMPLATES } from './scaffold.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('create-cliffy')
  .description('Create a new Cliffy project')
  .version(packageJson.version)
  .argument('[project-name]', 'Name of the project')
  .option('-t, --template <template>', 'Template to use (typescript-vite, bun, purescript)')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip dependency installation')
  .option('--package-manager <pm>', 'Package manager to use (npm, yarn, pnpm, bun)')
  .action(async (projectName: string | undefined, options: {
    template?: string;
    git: boolean;
    install: boolean;
    packageManager?: string;
  }) => {
    console.log();
    console.log(pc.bold(pc.cyan('  Cliffy') + ' - Reactive Framework with Geometric Algebra'));
    console.log();

    // Interactive mode if no project name provided
    if (!projectName) {
      const response = await prompts([
        {
          type: 'text',
          name: 'projectName',
          message: 'Project name:',
          initial: 'my-cliffy-app',
          validate: (value: string) => {
            if (!value) return 'Project name is required';
            if (!/^[a-z0-9-_]+$/i.test(value)) {
              return 'Project name can only contain letters, numbers, hyphens, and underscores';
            }
            return true;
          },
        },
        {
          type: 'select',
          name: 'template',
          message: 'Select a template:',
          choices: [
            {
              title: 'TypeScript + Vite (recommended)',
              value: 'typescript-vite',
              description: 'TypeScript app with Vite bundler and hot reload',
            },
            {
              title: 'Bun',
              value: 'bun',
              description: 'TypeScript app using Bun runtime',
            },
            {
              title: 'PureScript',
              value: 'purescript',
              description: 'Functional programming with PureScript',
            },
          ],
          initial: 0,
        },
        {
          type: 'confirm',
          name: 'git',
          message: 'Initialize git repository?',
          initial: true,
        },
        {
          type: 'confirm',
          name: 'install',
          message: 'Install dependencies?',
          initial: true,
        },
      ], {
        onCancel: () => {
          console.log(pc.red('\nOperation cancelled'));
          process.exit(0);
        },
      });

      projectName = response.projectName;
      options.template = response.template;
      options.git = response.git;
      options.install = response.install;
    }

    // Validate template
    const template = options.template || 'typescript-vite';
    if (!TEMPLATES.includes(template as any)) {
      console.error(pc.red(`Invalid template: ${template}`));
      console.error(`Available templates: ${TEMPLATES.join(', ')}`);
      process.exit(1);
    }

    // Detect package manager
    let packageManager = options.packageManager;
    if (!packageManager) {
      const userAgent = process.env.npm_config_user_agent || '';
      if (userAgent.includes('yarn')) {
        packageManager = 'yarn';
      } else if (userAgent.includes('pnpm')) {
        packageManager = 'pnpm';
      } else if (userAgent.includes('bun')) {
        packageManager = 'bun';
      } else {
        packageManager = 'npm';
      }
    }

    const scaffoldOptions: ScaffoldOptions = {
      projectName: projectName!,
      template: template as ScaffoldOptions['template'],
      initGit: options.git,
      installDeps: options.install,
      packageManager: packageManager as ScaffoldOptions['packageManager'],
    };

    try {
      await scaffold(scaffoldOptions);
    } catch (error) {
      console.error(pc.red('\nFailed to create project:'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
