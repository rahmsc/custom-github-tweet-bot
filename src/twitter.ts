import { TwitterApi } from "twitter-api-v2";
import type { TwitterConfig } from "./types";

const twitterConfig: TwitterConfig = {
  appKey: process.env.TWITTER_API_KEY ?? "",
  appSecret: process.env.TWITTER_API_SECRET ?? "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN ?? "",
  accessSecret: process.env.TWITTER_ACCESS_SECRET ?? "",
};

const client = new TwitterApi(twitterConfig);

export async function postTweet(tweetText: string): Promise<void> {
  try {
    await client.v2.tweet(tweetText);
  } catch (error) {
    console.error(
      "Error posting tweet:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}
