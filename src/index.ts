import dotenv from "dotenv";
import { getLatestCommits } from "./github";
import { generateTweet } from "./openai";
import { postTweet } from "./twitter";
import cron from "node-cron";

dotenv.config();

async function processCommits(): Promise<void> {
  try {
    // Get today's commits
    const commits = await getLatestCommits();

    if (commits.length === 0) {
      console.log("No commits found for today");
      return;
    }

    // Combine commit messages
    const commitSummary = commits.map((commit) => commit.message).join("\n");

    // Generate tweet using OpenAI
    const tweet = await generateTweet(commitSummary);

    // Post to Twitter
    await postTweet(tweet);

    console.log("Successfully posted tweet about today's commits");
  } catch (error) {
    console.error(
      "Error processing commits:",
      error instanceof Error ? error.message : error
    );
  }
}

// Run every day at 11:59 PM
cron.schedule("59 23 * * *", processCommits);

// Initial run
processCommits();
