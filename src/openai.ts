import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTweet(commitMessages: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that converts GitHub commit messages into engaging tweets. Keep it professional and under 280 characters.",
      },
      {
        role: "user",
        content: `Convert these commit messages into a tweet summarizing today's work: ${commitMessages}`,
      },
    ],
    max_tokens: 100,
  });

  if (!response.choices[0].message.content) {
    throw new Error("No tweet content generated");
  }

  return response.choices[0].message.content;
}
