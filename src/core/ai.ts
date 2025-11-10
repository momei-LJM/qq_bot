import OpenAI from "openai";

export async function chatWithDeepSeek(
  openai: OpenAI,
  message: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个友好的QQ机器人助手,请用简洁、友好的方式回复用户。",
        },
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
