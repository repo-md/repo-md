#!/usr/bin/env node

import { program } from 'commander';
import { create } from './commands/create';
import { createApp } from './commands/create-app';

// Set up the CLI
program
  .name('repomd')
  .description('RepoMD CLI for creating and managing content repositories')
  .version('0.0.1');

// Create command
program
  .command('create')
  .description('Create a new Repo.md project (content folder)')
  .argument('<directory>', 'Directory to create the project in')
  .option('--template <template>', 'Template to use (name or GitHub URL)')
  .action(create);

// Create app command
program
  .command('create-app')
  .description('Create a new app (website) to publish your content into')
  .argument('<directory>', 'Directory to create the app in')
  .requiredOption('-t, --template <template>', 'Template to use (name or GitHub URL)')
  .action(createApp);

// Parse arguments
program.parse();