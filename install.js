#!/usr/bin/env node

// Audika SMS Installation Wizard

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(60), 'cyan');
  console.log('');
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(`📦 ${description}...`, 'yellow');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed!`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed: ${description}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkPrerequisites() {
  logSection('Checking Prerequisites');
  
  const checks = [
    { name: 'Node.js', command: 'node', required: true },
    { name: 'npm', command: 'npm', required: true },
    { name: 'Git', command: 'git', required: false }
  ];
  
  let allRequired = true;
  
  for (const check of checks) {
    const isInstalled = checkCommand(check.command);
    if (isInstalled) {
      log(`✅ ${check.name} is installed`, 'green');
    } else {
      if (check.required) {
        log(`❌ ${check.name} is NOT installed (Required)`, 'red');
        allRequired = false;
      } else {
        log(`⚠️  ${check.name} is NOT installed (Optional)`, 'yellow');
      }
    }
  }
  
  if (!allRequired) {
    log('\n❌ Missing required prerequisites. Please install them before continuing.', 'red');
    process.exit(1);
  }
  
  return true;
}

async function setupEnvironment() {
  logSection('Environment Configuration');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await prompt(`${colors.yellow}⚠️  .env.local already exists. Overwrite? (y/N): ${colors.reset}`);
    if (overwrite.toLowerCase() !== 'y') {
      log('Keeping existing .env.local file', 'cyan');
      return;
    }
  }
  
  log('Please provide your environment configuration:', 'cyan');
  
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: await prompt('Supabase URL: '),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: await prompt('Supabase Anon Key: '),
    SUPABASE_SERVICE_ROLE_KEY: await prompt('Supabase Service Role Key: '),
    INFOBIP_API_KEY: await prompt('Infobip API Key (optional, press Enter to skip): '),
    INFOBIP_BASE_URL: await prompt('Infobip Base URL (optional, press Enter to skip): '),
    INFOBIP_SENDER: await prompt('Infobip Sender (optional, press Enter to skip): ')
  };
  
  const envContent = Object.entries(config)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
  log('✅ Environment configuration saved to .env.local', 'green');
  
  if (!fs.existsSync(envExamplePath)) {
    const exampleContent = Object.keys(config)
      .map(key => `${key}=`)
      .join('\n');
    fs.writeFileSync(envExamplePath, exampleContent);
    log('✅ Created .env.example template', 'green');
  }
}

async function installDependencies() {
  logSection('Installing Dependencies');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json not found. Are you in the correct directory?', 'red');
    process.exit(1);
  }
  
  const useNpm = await prompt(`${colors.cyan}Use npm to install dependencies? (Y/n): ${colors.reset}`);
  const packageManager = useNpm.toLowerCase() === 'n' ? 'yarn' : 'npm';
  
  if (packageManager === 'yarn' && !checkCommand('yarn')) {
    log('⚠️  Yarn is not installed. Falling back to npm.', 'yellow');
    packageManager = 'npm';
  }
  
  const installCommand = packageManager === 'npm' ? 'npm install' : 'yarn install';
  return runCommand(installCommand, 'Installing dependencies');
}

async function setupDatabase() {
  logSection('Database Setup');
  
  const setupDb = await prompt(`${colors.cyan}Would you like to run database migrations? (y/N): ${colors.reset}`);
  
  if (setupDb.toLowerCase() === 'y') {
    if (!checkCommand('npx')) {
      log('❌ npx is not available. Skipping database setup.', 'red');
      return false;
    }
    
    log('Running Supabase migrations...', 'yellow');
    
    const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations');
    if (!fs.existsSync(migrationsPath)) {
      log('⚠️  No migrations folder found. Skipping database setup.', 'yellow');
      return false;
    }
    
    return runCommand('npx supabase db push', 'Applying database migrations');
  }
  
  log('Skipping database setup', 'cyan');
  return true;
}

async function generateTypes() {
  logSection('Type Generation');
  
  const generateTypesCmd = await prompt(`${colors.cyan}Generate TypeScript types from database? (y/N): ${colors.reset}`);
  
  if (generateTypesCmd.toLowerCase() === 'y') {
    return runCommand('npm run update-types', 'Generating TypeScript types');
  }
  
  log('Skipping type generation', 'cyan');
  return true;
}

async function buildProject() {
  logSection('Build Project');
  
  const build = await prompt(`${colors.cyan}Would you like to build the project? (y/N): ${colors.reset}`);
  
  if (build.toLowerCase() === 'y') {
    return runCommand('npm run build', 'Building project');
  }
  
  log('Skipping build', 'cyan');
  return true;
}

async function finalChecks() {
  logSection('Final Setup');
  
  log('Running linter...', 'yellow');
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    log('✅ Linting passed!', 'green');
  } catch {
    log('⚠️  Linting has warnings or errors. Run "npm run lint" to see details.', 'yellow');
  }
  
  console.log('');
  log('🎉 Installation Complete!', 'green');
  console.log('');
  log('Next steps:', 'bright');
  log('1. Review your .env.local configuration', 'cyan');
  log('2. Run "npm run dev" to start the development server', 'cyan');
  log('3. Visit http://localhost:3000 to view the application', 'cyan');
  console.log('');
  log('For production deployment:', 'bright');
  log('1. Run "npm run build" to create production build', 'cyan');
  log('2. Run "npm start" to start production server', 'cyan');
  console.log('');
}

async function main() {
  console.clear();
  log('╔════════════════════════════════════════════════════════╗', 'bright');
  log('║         AUDIKA SMS - Installation Wizard               ║', 'bright');
  log('║                   Version 1.0.0                        ║', 'bright');
  log('╚════════════════════════════════════════════════════════╝', 'bright');
  
  try {
    await checkPrerequisites();
    await setupEnvironment();
    await installDependencies();
    await setupDatabase();
    await generateTypes();
    await buildProject();
    await finalChecks();
  } catch (error) {
    console.error('');
    log('❌ Installation failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error('\n💥 Installation failed with error:');
  console.error(error.message || error);
  console.error('\nPlease check the error above and try again.');
  process.exit(1);
});