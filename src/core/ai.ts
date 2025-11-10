import OpenAI from "openai";
import { SYSTEMS } from "./systems";

export async function chatWithDeepSeek(
  openai: OpenAI,
  message: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        ...SYSTEMS,
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "抱歉,我暂时无法回复。";
  } catch (error) {
    console.error("DeepSeek API 调用失败:", error);
    return "抱歉,我遇到了一些问题,请稍后再试。";
  }
}
