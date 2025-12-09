import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client (will be null if no API key)
let anthropic: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export async function generateEmojiBlessing(
  gratefulFor: string[],
  makeGreat: string[],
  freeResponse?: string
): Promise<string | null> {
  // Return null if Anthropic is not configured
  if (!anthropic) {
    console.log("Anthropic API key not configured, skipping emoji generation");
    return null;
  }

  try {
    console.log("Generating emoji blessing for check-in...");

    // Prepare the context for Claude
    const checkInContext = `
Today's check-in:
- Grateful for: ${gratefulFor.join(", ")}
- Would make today great: ${makeGreat.join(", ")}
${freeResponse ? `- Additional thoughts: ${freeResponse}` : ""}
`;

    // Ask Claude to generate emojis
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `
Based on this daily check-in, provide exactly 5 emojis that serve as a magical summary for this person's check-in.
The emojis should reflect their gratitude, goals, and overall energy.
Only respond with the 5 emojis, nothing else.
No spaces between emojis.
It should be an aesthetically pleasing arrangement of 5 topical emojis.
Symmetry or repetition is okay. ✨✨✨
NOTE: If there is flirty / sexual content, be sure to include emojis that reference it, since that would be the most delightful.
--------------------------------

${checkInContext}`,
        },
      ],
    });

    // Extract the emoji response
    const emojiText =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : null;

    console.log("Claude response:", emojiText);

    // Validate we got a response
    if (emojiText && emojiText.length > 0) {
      // Just return the text as-is since Claude is instructed to only return emojis
      // Remove any spaces that might have been added
      const cleanEmojis = emojiText.replace(/\s+/g, "");
      console.log("Returning emojis:", cleanEmojis);
      return cleanEmojis;
    }

    return null;
  } catch (error) {
    console.error("Error generating emoji blessing:", error);
    return null;
  }
}
