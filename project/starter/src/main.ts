import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';

dotenv.config();

async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  if (!owner || !repo || !prStr) {
    console.error('Usage: npm run dev <owner> <repo> <pr-number>');
    process.exit(1);
  }

  const prNumber = parseInt(prStr, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    console.error(`Error: PR number must be a valid positive integer, received: "${prStr}"`);
    process.exit(1);
  }

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasBedrockKeys =
    !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

  if (hasBedrockKeys) {
    console.log('🔐 Using AWS Bedrock authentication');
  } else if (hasAnthropicKey) {
    console.log('Using Anthropic API authentication');
  } else {
    console.error('Error: No authentication configured.');
    process.exit(1);
  }

  logger.info(`Starting review of ${owner}/${repo} PR #${prNumber}...`);
  logger.info('Starting code review', {
    service: 'code-review-system',
    owner,
    repo,
    prNumber,
  });

  const startTime = Date.now();

  try {
    const orchestrator = new CodeReviewOrchestrator();
    const report = await orchestrator.reviewPullRequest({
      owner,
      repo,
      prNumber,
    });

    const duration = Date.now() - startTime;
    report.metadata.duration = duration;

    logger.info('Code review completed', {
      service: 'code-review-system',
      owner,
      repo,
      prNumber,
      score: report.summary.overallScore,
      duration,
      status: 'success',
    });

    const reportGen = new ReportGenerator();
    const markdownOutput = reportGen.generateMarkdownReport(report);
    const htmlOutput = reportGen.generateHTMLReport(report);
    const jsonOutput = reportGen.generateJSONReport(report);

    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Step 10 & 11 requirement: owner_repo_prNumber
    const baseFileName = `${owner}_${repo}_${prNumber}`;
    const mdPath = path.join(reportsDir, `${baseFileName}.md`);
    const htmlPath = path.join(reportsDir, `${baseFileName}.html`);
    const jsonPath = path.join(reportsDir, `${baseFileName}.json`);

    fs.writeFileSync(mdPath, markdownOutput, 'utf-8');
    fs.writeFileSync(htmlPath, htmlOutput, 'utf-8');
    fs.writeFileSync(jsonPath, jsonOutput, 'utf-8');

    logger.info('Review complete. Reports saved:');
    logger.info(`JSON:     reports/${baseFileName}.json`);
    logger.info(`Markdown: reports/${baseFileName}.md`);
    logger.info(`HTML:     reports/${baseFileName}.html`);
    logger.info(`Overall score: ${report.summary.overallScore}/100`);
  } catch (error) {
    logger.error('Code review failed:', error);
    process.exit(1);
  }
}

main();