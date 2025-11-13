import OpenAI from "openai";
import { SYSTEMS } from "./systems";
import type { MessageStorageService } from "../services/message-storage";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithDeepSeek(
  openai: OpenAI,
  message: string,
  historyMessages?: ChatMessage[]
): Promise<string> {
  try {
    // 构建消息数组
    const messages: any[] = [...SYSTEMS];

    // 如果有历史消息，添加到对话中
    if (historyMessages && historyMessages.length > 0) {
      // 限制历史消息数量，避免 token 过多
      const limitedHistory = historyMessages.slice(-10);
      messages.push(...limitedHistory);
    }

    // 添加当前用户消息
    messages.push({
      role: "user",
      content: message,
    });

    const response = await openai.chat.completions.create({
      model: "doubao-seed-1-6-lite-251015",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      reasoning_effort: "medium",
    });

    return response.choices[0]?.message?.content || "抱歉,我暂时无法回复。";
  } catch (error) {
    console.error("DeepSeek API 调用失败:", error);
    return "抱歉,我遇到了一些问题,请稍后再试。";
  }
}

/**
 * 带历史上下文的 DeepSeek 聊天函数
 * 自动从消息存储中获取最近的对话历史
 */
export async function chatWithDeepSeekWithContext(
  openai: OpenAI,
  message: string,
  groupId: string,
  userId: string,
  messageStorage: MessageStorageService,
  contextCount: number = 10
): Promise<string> {
  try {
    // 获取最近的消息作为上下文
    const recentMessages = await messageStorage.getRecentMessages(
      groupId,
      contextCount
    );

    // 转换为对话格式，只保留相关的用户对话
    const historyMessages: ChatMessage[] = [];

    for (const msg of recentMessages.reverse()) {
      // 跳过系统消息和太长的消息
      if (msg.raw_message.length > 200) continue;

      historyMessages.push({
        role: "user",
        content: msg.raw_message,
      });
      // 如果有对应的 AI 回复，也可以添加（这里暂时跳过，因为需要识别 AI 消息）
    }

    // 限制历史消息数量
    const limitedHistory = historyMessages.slice(-contextCount);

    return await chatWithDeepSeek(openai, message, limitedHistory);
  } catch (error) {
    console.error("获取历史上下文失败，使用无上下文模式:", error);
    // 如果获取历史失败，回退到无上下文模式
    return await chatWithDeepSeek(openai, message);
  }
}
