#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../../package.json');

/**
 * Executes a shell command and returns the output
 */
function exec(command) {
    try {
        return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        throw error;
    }
}

/**
 * Gets the current branch name
 */
function getCurrentBranch() {
    return exec('git rev-parse --abbrev-ref HEAD');
}

/**
 * Gets the latest git tag
 */
function getLatestTag() {
    try {
        return exec('git describe --tags --abbrev=0');
    } catch {
        return null;
    }
}

/**
 * Gets commit messages since the last tag
 */
function getCommitsSinceLastTag() {
    const latestTag = getLatestTag();
    const command = latestTag
        ? `git log ${latestTag}..HEAD --pretty=format:"%s"`
        : 'git log --pretty=format:"%s"';

    const output = exec(command);
    return output ? output.split('\n').filter(Boolean) : [];
}

/**
 * Determines the version bump type based on conventional commits
 */
function determineBumpType(commits) {
    let bumpType = null;

    for (const commit of commits) {
        // Check for breaking changes
        if (commit.includes('BREAKING CHANGE') || commit.match(/^[a-z]+(\(.+\))?!:/)) {
            return 'major';
        }

        // Check for features
        if (commit.match(/^feat(\(.+\))?:/)) {
            bumpType = 'minor';
            continue;
        }

        // Check for fixes
        if (commit.match(/^fix(\(.+\))?:/) && !bumpType) {
            bumpType = 'patch';
        }
    }

    // Only bump version for feat, fix, or breaking changes
    // Commits like chore:, ci:, docs:, style:, refactor:, test:, build:, perf: do NOT trigger a version bump
    return bumpType;
}

/**
 * Parses a version string into components
 */
function parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
        throw new Error(`Invalid version format: ${version}`);
    }

    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4] || null
    };
}

/**
 * Bumps the version based on the bump type
 */
function bumpVersion(currentVersion, bumpType, prerelease = null) {
    const version = parseVersion(currentVersion);

    switch (bumpType) {
        case 'major':
            version.major++;
            version.minor = 0;
            version.patch = 0;
            break;
        case 'minor':
            version.minor++;
            version.patch = 0;
            break;
        case 'patch':
            version.patch++;
            break;
    }

    let newVersion = `${version.major}.${version.minor}.${version.patch}`;

    if (prerelease) {
        newVersion += `-${prerelease}`;
    }

    return newVersion;
}

/**
 * Gets the prerelease counter for the current version
 */
function getPrereleaseCounter(currentVersion, prereleaseSuffix) {
    const version = parseVersion(currentVersion);

    if (version.prerelease && version.prerelease.startsWith(prereleaseSuffix)) {
        const match = version.prerelease.match(/\.(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    return 0;
}

/**
 * Main function
 */
function main() {
    const branch = getCurrentBranch();
    console.log(`Current branch: ${branch}`);

    // Read current version from package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;
    console.log(`Current version: ${currentVersion}`);

    // Get commits since last tag
    const commits = getCommitsSinceLastTag();
    console.log(`Found ${commits.length} commits since last tag`);

    if (commits.length === 0) {
        console.log('No commits since last tag, skipping version bump');
        return;
    }

    // Determine bump type
    const bumpType = determineBumpType(commits);

    if (!bumpType) {
        console.log('No version bump needed (no conventional commits found)');
        return;
    }

    console.log(`Determined bump type: ${bumpType}`);

    // Determine prerelease suffix based on branch
    let prereleaseSuffix = null;
    let newVersion;

    if (branch.startsWith('release/')) {
        // For release branches, use -rc.X suffix
        prereleaseSuffix = 'rc';
        const counter = getPrereleaseCounter(currentVersion, prereleaseSuffix);

        // Check if we need to bump the base version or just the prerelease counter
        const currentParsed = parseVersion(currentVersion);
        if (currentParsed.prerelease && currentParsed.prerelease.startsWith('rc')) {
            // Already a release candidate, just increment the counter
            newVersion = currentVersion.replace(/rc\.\d+$/, `rc.${counter + 1}`);
        } else {
            // New release candidate
            newVersion = bumpVersion(currentVersion, bumpType, `${prereleaseSuffix}.0`);
        }
    } else if (branch.startsWith('hotfix/')) {
        // For hotfix branches, always do a patch bump (no prerelease)
        newVersion = bumpVersion(currentVersion.replace(/-.*$/, ''), 'patch');
    } else {
        // For main branch, do normal semantic versioning
        newVersion = bumpVersion(currentVersion.replace(/-.*$/, ''), bumpType);
    }

    console.log(`New version: ${newVersion}`);

    // Update package.json
    packageJson.version = newVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    console.log('✓ Updated package.json');
    
    // Write outputs to GitHub Actions environment file
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, `old-version=${currentVersion}\n`);
        appendFileSync(process.env.GITHUB_OUTPUT, `new-version=${newVersion}\n`);
        appendFileSync(process.env.GITHUB_OUTPUT, `bump-type=${bumpType}\n`);
    } else {
        // Fallback for local testing
        console.log(`old-version=${currentVersion}`);
        console.log(`new-version=${newVersion}`);
        console.log(`bump-type=${bumpType}`);
    }
}

main();
