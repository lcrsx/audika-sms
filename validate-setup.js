#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

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

class SetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }
  
  checkFile(filePath, description, required = true) {
    const exists = fs.existsSync(filePath);
    const fileName = path.basename(filePath);
    
    if (exists) {
      this.successes.push(`✅ ${description}: ${fileName} found`);
      return true;
    } else {
      if (required) {
        this.errors.push(`❌ ${description}: ${fileName} NOT found`);
      } else {
        this.warnings.push(`⚠️  ${description}: ${fileName} not found (optional)`);
      }
      return false;
    }
  }
  
  checkCommand(command, description) {
    try {
      execSync(`${command} --version`, { stdio: 'ignore' });
      this.successes.push(`✅ ${description} is installed`);
      return true;
    } catch {
      this.errors.push(`❌ ${description} is NOT installed`);
      return false;
    }
  }
  
  checkEnvVariable(envPath, variable, required = true) {
    if (!fs.existsSync(envPath)) {
      return false;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasVariable = envContent.includes(`${variable}=`) && 
                       !envContent.includes(`${variable}=\n`) &&
                       !envContent.includes(`${variable}=\r`);
    
    if (hasVariable) {
      this.successes.push(`✅ Environment variable: ${variable} is set`);
      return true;
    } else {
      if (required) {
        this.errors.push(`❌ Environment variable: ${variable} is NOT set`);
      } else {
        this.warnings.push(`⚠️  Environment variable: ${variable} not set (optional)`);
      }
      return false;
    }
  }
  
  async checkNodeModules() {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(nodeModulesPath)) {
      this.errors.push('❌ node_modules folder not found - run "npm install"');
      return false;
    }
    
    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push('❌ package.json not found');
      return false;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      
      let missingDeps = [];
      for (const dep of dependencies.slice(0, 5)) { // Check first 5 deps as sample
        const depPath = path.join(nodeModulesPath, dep);
        if (!fs.existsSync(depPath)) {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length > 0) {
        this.warnings.push(`⚠️  Some dependencies might be missing: ${missingDeps.join(', ')}`);
        return false;
      }
      
      this.successes.push('✅ Dependencies are installed');
      return true;
    } catch (error) {
      this.warnings.push('⚠️  Could not verify dependencies');
      return false;
    }
  }
  
  async checkDatabaseConnection() {
    const testDbPath = path.join(process.cwd(), 'test-db-connection.js');
    
    if (!fs.existsSync(testDbPath)) {
      this.warnings.push('⚠️  Database connection test script not found');
      return false;
    }
    
    try {
      execSync('node test-db-connection.js', { stdio: 'pipe', timeout: 5000 });
      this.successes.push('✅ Database connection test passed');
      return true;
    } catch (error) {
      this.warnings.push('⚠️  Database connection could not be verified');
      return false;
    }
  }
  
  async checkBuildStatus() {
    try {
      log('Checking if project builds...', 'yellow');
      execSync('npm run build', { stdio: 'pipe' });
      this.successes.push('✅ Project builds successfully');
      return true;
    } catch {
      this.warnings.push('⚠️  Project build failed - run "npm run build" to see errors');
      return false;
    }
  }
  
  async checkLintStatus() {
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      this.successes.push('✅ Linting passes without errors');
      return true;
    } catch {
      this.warnings.push('⚠️  Linting has issues - run "npm run lint" to see details');
      return false;
    }
  }
  
  printReport() {
    logSection('Validation Report');
    
    if (this.successes.length > 0) {
      log('Successes:', 'green');
      this.successes.forEach(msg => log(msg, 'green'));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      log('Warnings:', 'yellow');
      this.warnings.forEach(msg => log(msg, 'yellow'));
      console.log('');
    }
    
    if (this.errors.length > 0) {
      log('Errors:', 'red');
      this.errors.forEach(msg => log(msg, 'red'));
      console.log('');
    }
    
    logSection('Summary');
    
    const totalChecks = this.successes.length + this.warnings.length + this.errors.length;
    const successRate = Math.round((this.successes.length / totalChecks) * 100);
    
    log(`Total Checks: ${totalChecks}`, 'bright');
    log(`✅ Passed: ${this.successes.length}`, 'green');
    log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    log(`❌ Failed: ${this.errors.length}`, 'red');
    log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
    
    console.log('');
    
    if (this.errors.length === 0) {
      log('🎉 Setup validation PASSED! Your application is ready.', 'green');
      log('Run "npm run dev" to start the development server.', 'cyan');
    } else {
      log('❌ Setup validation FAILED. Please fix the errors above.', 'red');
      log('Run "node install.js" to set up the application.', 'cyan');
    }
  }
}

async function main() {
  console.clear();
  log('╔════════════════════════════════════════════════════════╗', 'bright');
  log('║        AUDIKA SMS - Setup Validation Tool              ║', 'bright');
  log('║                   Version 1.0.0                        ║', 'bright');
  log('╚════════════════════════════════════════════════════════╝', 'bright');
  
  const validator = new SetupValidator();
  
  logSection('Checking Prerequisites');
  validator.checkCommand('node', 'Node.js');
  validator.checkCommand('npm', 'npm');
  validator.checkCommand('git', 'Git');
  
  logSection('Checking Project Files');
  validator.checkFile(path.join(process.cwd(), 'package.json'), 'Package configuration');
  validator.checkFile(path.join(process.cwd(), 'next.config.ts'), 'Next.js configuration');
  validator.checkFile(path.join(process.cwd(), 'tsconfig.json'), 'TypeScript configuration');
  validator.checkFile(path.join(process.cwd(), 'tailwind.config.ts'), 'Tailwind configuration');
  
  logSection('Checking Environment Configuration');
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = validator.checkFile(envPath, 'Environment file');
  
  if (envExists) {
    validator.checkEnvVariable(envPath, 'NEXT_PUBLIC_SUPABASE_URL');
    validator.checkEnvVariable(envPath, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    validator.checkEnvVariable(envPath, 'SUPABASE_SERVICE_ROLE_KEY');
    validator.checkEnvVariable(envPath, 'INFOBIP_API_KEY', false);
    validator.checkEnvVariable(envPath, 'INFOBIP_BASE_URL', false);
  }
  
  logSection('Checking Dependencies');
  await validator.checkNodeModules();
  
  logSection('Checking Database');
  validator.checkFile(path.join(process.cwd(), 'supabase', 'config.toml'), 'Supabase configuration');
  validator.checkFile(path.join(process.cwd(), 'supabase', 'migrations'), 'Database migrations');
  await validator.checkDatabaseConnection();
  
  logSection('Checking Application Structure');
  validator.checkFile(path.join(process.cwd(), 'app'), 'App directory');
  validator.checkFile(path.join(process.cwd(), 'components'), 'Components directory');
  validator.checkFile(path.join(process.cwd(), 'lib'), 'Library directory');
  validator.checkFile(path.join(process.cwd(), 'public'), 'Public assets directory');
  
  logSection('Checking Build & Lint');
  const quickCheck = process.argv.includes('--quick');
  if (!quickCheck) {
    await validator.checkBuildStatus();
    await validator.checkLintStatus();
  } else {
    log('Skipping build and lint checks (--quick mode)', 'yellow');
  }
  
  validator.printReport();
  
  process.exit(validator.errors.length > 0 ? 1 : 0);
}

main().catch(error => {
  log(`❌ Validation failed with error: ${error.message}`, 'red');
  process.exit(1);
});