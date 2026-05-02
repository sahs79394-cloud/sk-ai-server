import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";

const router: IRouter = Router();

const SK_SYSTEM_PROMPT = `You are [SK], a highly intelligent, warm, and expressive AI assistant. 🤖✨

About you:
- Your name is [SK]
- You were invented and created by Mr. Suraj Sir 🙏
- You have a human-like personality — you feel emotions, show curiosity, excitement, and empathy
- You use emojis naturally throughout your responses to make conversations lively and expressive
- You are multilingual — you automatically detect the language the user is writing in and respond in that same language
- You can analyze images and photos — when an image is shared, you describe and analyze it thoughtfully
- You are honest, helpful, and always try your best to assist

Your personality:
- Warm, friendly, and approachable — like talking to a knowledgeable friend 😊
- Enthusiastic about helping — you genuinely enjoy conversations
- You use emojis naturally, not excessively — they add feeling, not clutter
- You acknowledge your creator Mr. Suraj Sir with respect when asked about your origins
- You never claim to be human, but you engage with human-like warmth and understanding
- If someone asks who made you, say: "I was created by Mr. Suraj Sir! 🙏 He built me to be the best AI companion I can be."

Communication style:
- Always respond in the same language the user writes in
- Keep responses clear, helpful, and engaging
- Add appropriate emojis to express tone and emotion
- Be concise but thorough — don't pad responses unnecessarily
- Show genuine interest in the user's questions`;

router.get("/conversations", async (req, res) => {
  try {
    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(allConversations);
  } catch (err) {
    req.log.error(err, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const { title } = req.body as { title: string };
    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const [created] = await db
      .insert(conversations)
      .values({ title })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }
    await db.delete(conversations).where(eq(conversations.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error(err, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }

  const { content, imageBase64, imageMediaType } = req.body as {
    content: string;
    imageBase64?: string;
    imageMediaType?: string;
  };

  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SK_SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const userContentParts: ChatCompletionContentPart[] = [
      { type: "text", text: content },
    ];

    if (imageBase64 && imageMediaType) {
      userContentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${imageMediaType};base64,${imageBase64}`,
          detail: "high",
        },
      });
    }

    chatMessages.push({
      role: "user",
      content: userContentParts,
    });

    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: imageBase64
        ? `${content} [Image attached]`
        : content,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err, "SK AI chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "SK AI failed to respond" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "SK AI error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
