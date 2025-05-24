#!/usr/bin/env node

/**
 * Script to check version compatibility between the Node.js version and package dependencies
 * This helps prevent deployment failures due to version incompatibilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the current Node.js version
const nodeVersion = process.version;
const numericNodeVersion = parseFloat(nodeVersion.replace('v', ''));

console.log(`Current Node.js version: ${nodeVersion}`);

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
let packageJson;

try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Check engines field if it exists
if (packageJson.engines && packageJson.engines.node) {
  const requiredNodeVersion = packageJson.engines.node;
  console.log(`Required Node.js version in package.json: ${requiredNodeVersion}`);
  
  // Simple check for minimum version
  if (requiredNodeVersion.includes('>=')) {
    const minVersion = parseFloat(requiredNodeVersion.replace('>=', ''));
    if (numericNodeVersion < minVersion) {
      console.error(`⚠️ WARNING: Current Node.js version ${nodeVersion} does not meet the requirement: ${requiredNodeVersion}`);
      console.error(`Please upgrade Node.js to version ${minVersion} or higher.`);
      process.exit(1);
    }
  }
} else {
  console.log('No specific Node.js version requirement found in package.json');
}

// Check major dependencies for Node.js requirements
const dependenciesToCheck = [
  '@nestjs/core',
  '@nestjs/common',
  'drizzle-orm',
  'typescript'
];

console.log('\nChecking major dependencies for Node.js compatibility:');

let hasIncompatibilities = false;

for (const depName of dependenciesToCheck) {
  if (packageJson.dependencies && packageJson.dependencies[depName]) {
    const version = packageJson.dependencies[depName];
    console.log(`- ${depName}: ${version}`);
    
    try {
      // Try to get the package's engines requirement
      const packageInfoCommand = `npm view ${depName}@${version} engines --json`;
      const packageInfo = execSync(packageInfoCommand, { encoding: 'utf8' });
      
      if (packageInfo) {
        const engines = JSON.parse(packageInfo);
        if (engines && engines.node) {
          console.log(`  Required Node.js: ${engines.node}`);
          
          // Check if current Node.js version is compatible
          if (engines.node.includes('>=')) {
            const minVersion = parseFloat(engines.node.replace('>=', ''));
            if (numericNodeVersion < minVersion) {
              console.error(`  ⚠️ INCOMPATIBLE: ${depName} requires Node.js ${engines.node}`);
              hasIncompatibilities = true;
            } else {
              console.log('  ✓ Compatible');
            }
          }
        }
      }
    } catch (error) {
      console.log(`  Unable to check Node.js requirement: ${error.message}`);
    }
  }
}

if (hasIncompatibilities) {
  console.error('\n⚠️ Detected incompatibilities between dependencies and current Node.js version');
  console.error('Please update your Node.js version or adjust your dependencies');
  process.exit(1);
} else {
  console.log('\n✅ All checked dependencies appear to be compatible with the current Node.js version');
}

console.log('\nEnvironment check complete');