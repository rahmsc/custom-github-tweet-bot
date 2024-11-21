import { Octokit } from "octokit";
import type { Commit } from "./types";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function getLatestCommits(): Promise<Commit[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const response = await octokit.request("GET /users/{username}/events", {
    username: process.env.GITHUB_USERNAME,
    per_page: 100,
  });
  return (
    response.data
      .filter(
        (event: { type: string; created_at: string }) =>
          event.type === "PushEvent"
      )
      .filter(
        (event: { created_at: string }) => new Date(event.created_at) >= today
      )
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      .flatMap(
        (event: { payload: { commits: any[] } }) => event.payload.commits
      )
      .map((commit: { message: string; timestamp: string }) => ({
        message: commit.message,
        timestamp: commit.timestamp,
      }))
  );
}
