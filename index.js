import { Octokit } from "octokit";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { TwitterApi } from "twitter-api-v2";
import readline from "node:readline/promises";

// Initialize dotenv
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

if (
  !GITHUB_TOKEN ||
  !GITHUB_USERNAME ||
  !OPENAI_API_KEY ||
  !TWITTER_API_KEY ||
  !TWITTER_API_SECRET ||
  !TWITTER_ACCESS_TOKEN ||
  !TWITTER_ACCESS_SECRET
)
  throw new Error("Missing required environment variables");

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const twitterClient = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_SECRET,
});

async function generateTweet({ messages, repositories }) {
  const prompt = `
    Create a tweet summarizing today's GitHub commits in this exact format:

    Today's #git commit[s]

    - [Bullet points of commit summaries, rewritten to be more user-friendly and engaging]

    [Optional: A brief concluding statement if relevant]

    #buildinpublic #development [+ other relevant hashtags]

    Example formats:
    1. "Today's #git commits

    - Finished up some final hooks and data fetching for the MVP of the #react native app. 
    
    Now comes branding & design!

    #buildinpublic #mobiledev #MobileApp"

    2. "Today's #git commits

    - Created some hooks for fetching data to display on my #React Native app.
    - Started using React Native Skia to create some new graphic with animations for displaying user data.

    #buildingpublic #MobileAppDevelopment"

    Here are the commits to summarize:
    Commits: ${JSON.stringify(messages)}
    Repositories: ${JSON.stringify(repositories)}
    
    Requirements:
    - Always start with "Today's #git commit" or "Today's #git commits"
    - Convert technical commit messages into user-friendly bullet points
    - Include relevant tech hashtags (#react, #supabase, etc.) within the bullet points
    - Always include #buildinpublic
    - Keep it under 280 characters
    - Make it sound enthusiastic and achievement-focused
    - Make it sound like you're a human doing this, not a bot
    -Ignore and don't use any names for the specific sections worked on, just generalisations
    -The commits returned will be most recent first, but can you start from the bottom first in the tweet.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating tweet:", error);
    return null;
  }
}

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

    // Get unique repositories
    const repositories = [
      ...new Set(response.data.items.map((item) => item.repository.full_name)),
    ];

    // Return both the detailed commits and the combined messages
    return {
      commits: response.data.items.map((item) => ({
        sha: item.sha,
        message: item.commit.message,
        repository: item.repository.full_name,
        timestamp: item.commit.committer?.date || "",
        url: item.html_url,
      })),
      combinedMessages: response.data.items.map((item) => item.commit.message),
      repositories,
    };
  } catch (error) {
    console.error("Error fetching commits:", error.message);
    return { commits: [], combinedMessages: [], repositories: [] };
  }
}

async function postTweet(tweet) {
  try {
    const response = await twitterClient.v2.tweet(tweet);
    console.log("Tweet posted successfully!");
    console.log(
      "Tweet URL:",
      `https://twitter.com/user/status/${response.data.id}`
    );
    return response;
  } catch (error) {
    console.error("Error posting tweet:", error);
    return null;
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

  const { commits, combinedMessages, repositories } = await getDailyCommits();

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

  // Log the combined messages array
  console.log("\nAll commit messages in a single array:");
  console.log(combinedMessages);

  // Generate and display tweet
  console.log("\nGenerating tweet from commits...");
  const tweet = await generateTweet({
    messages: combinedMessages,
    repositories,
  });

  if (tweet) {
    console.log("\nGenerated Tweet:");
    console.log("--------------------");
    console.log(tweet);
    console.log("--------------------");

    // Create readline interface using ESM syntax
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const answer = await rl.question(
        "\nDo you want to post this tweet? (y/n) "
      );
      if (answer.toLowerCase() === "y") {
        await postTweet(tweet);
      } else {
        console.log("Tweet cancelled");
      }
    } finally {
      rl.close();
    }
  }
}

main().catch(console.error);
