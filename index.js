import { Octokit } from "octokit";
import * as dotenv from "dotenv";
// import { fileURLToPath } from 'url'
// import { dirname } from 'path'

// Initialize dotenv
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

if (!GITHUB_TOKEN || !GITHUB_USERNAME)
  throw new Error("Missing required environment variables");

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getDailyCommits() {
  try {
    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Search for commits
    const response = await octokit.rest.search.commits({
      q: `author:${GITHUB_USERNAME} committer-date:>=${today.toISOString()}`,
      sort: "committer-date",
      order: "desc",
    });

    return response.data.items.map((item) => ({
      sha: item.sha,
      message: item.commit.message,
      repository: item.repository.full_name,
      timestamp: item.commit.committer?.date || "",
      url: item.html_url,
    }));
  } catch (error) {
    console.error("Error fetching commits:", error.message);
    return [];
  }
}

async function main() {
  console.log("Testing GitHub API connection...");

  try {
    const user = await octokit.rest.users.getAuthenticated();
    console.log("Successfully connected to GitHub API");
    console.log("Authenticated as:", user.data.login);
  } catch (error) {
    console.error("Failed to connect to GitHub API:", error);
    return;
  }

  const commits = await getDailyCommits();

  if (!commits.length) {
    console.log("No commits found for today.");
    return;
  }
  console.log(`\nFound ${commits.length} commits for today:\n`);
  for (const commit of commits) {
    console.log(`Repository: ${commit.repository}`);
    console.log(`Message: ${commit.message}`);
    console.log(`Time: ${new Date(commit.timestamp).toLocaleTimeString()}`);
    console.log(`URL: ${commit.url}\n`);
  }
}

main().catch(console.error);
