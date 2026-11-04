import { describe, expect, it } from "vitest";
import {
  chatsToMarkdown,
  countMessages,
  detectFormat,
  parseChats,
  threadToMarkdown,
} from "@/lib/chat-export";

const CHATGPT = JSON.stringify([
  {
    title: "Fixture chat",
    create_time: 1_717_000_000,
    current_node: "n3",
    mapping: {
      root: { id: "root", parent: null, children: ["sys"], message: null },
      sys: {
        id: "sys",
        parent: "root",
        children: ["n1"],
        message: {
          author: { role: "system" },
          content: { parts: ["You are a helpful assistant."] },
          create_time: 1_717_000_000,
        },
      },
      n1: {
        id: "n1",
        parent: "sys",
        children: ["n2"],
        message: {
          author: { role: "user" },
          content: { content_type: "text", parts: ["Hello there"] },
          create_time: 1_717_000_001,
        },
      },
      n2: {
        id: "n2",
        parent: "n1",
        children: ["n3"],
        message: {
          author: { role: "assistant" },
          content: { parts: ["Hi! How can I help?"] },
          create_time: 1_717_000_002,
        },
      },
      // Sibling branch that the user edited away
      n2b: {
        id: "n2b",
        parent: "n1",
        children: [],
        message: {
          author: { role: "assistant" },
          content: { parts: ["Discarded draft"] },
          create_time: 1_717_000_004,
        },
      },
      n3: {
        id: "n3",
        parent: "n2",
        children: [],
        message: {
          author: { role: "user" },
          content: { parts: ["Write a poem"] },
          create_time: 1_717_000_003,
        },
      },
    },
  },
]);

const CLAUDE = JSON.stringify([
  {
    name: "Claude chat",
    created_at: "2024-06-01T10:00:00Z",
    chat_messages: [
      { sender: "human", text: "What is a monad?" },
      { sender: "assistant", content: [{ type: "text", text: "A monoid in the category of endofunctors." }] },
    ],
  },
]);

describe("format detection", () => {
  it("recognises the three JSON shapes", () => {
    expect(detectFormat(CHATGPT)).toBe("chatgpt");
    expect(detectFormat(CLAUDE)).toBe("claude");
    expect(detectFormat('{"messages":[{"role":"user","content":"hi"}]}')).toBe("generic");
    expect(detectFormat("User: hi")).toBe("text");
    expect(detectFormat("{not json")).toBe("text");
  });
});

describe("ChatGPT export", () => {
  const threads = parseChats(CHATGPT);

  it("walks the current node back to the root", () => {
    expect(threads).toHaveLength(1);
    expect(threads[0].title).toBe("Fixture chat");
    expect(threads[0].messages.map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
    ]);
  });

  it("drops the edited-away branch", () => {
    const texts = threads[0].messages.map((message) => message.text);
    expect(texts).not.toContain("Discarded draft");
    expect(texts[3]).toBe("Write a poem");
  });
});

describe("Claude export", () => {
  it("reads senders and content blocks", () => {
    const [thread] = parseChats(CLAUDE);
    expect(thread.title).toBe("Claude chat");
    expect(thread.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(thread.messages[1].text).toContain("endofunctors");
  });
});

describe("plain transcripts", () => {
  it("splits on speaker markers", () => {
    const source = [
      "You said:",
      "What is a monad?",
      "",
      "ChatGPT said:",
      "A monoid in the category of endofunctors.",
    ].join("\n");
    const [thread] = parseChats(source);
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[0]).toMatchObject({ role: "user", text: "What is a monad?" });
    expect(thread.messages[1].role).toBe("assistant");
  });

  it("accepts bold and Chinese markers", () => {
    const source = "**用户：**\n你好\n\n**助手：**\n你好，有什么可以帮你？";
    const [thread] = parseChats(source);
    expect(thread.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("rejects text without any marker", () => {
    expect(() => parseChats("just a paragraph of prose")).toThrow();
  });
});

describe("markdown output", () => {
  it("writes a heading per turn and skips system messages by default", () => {
    const [thread] = parseChats(CHATGPT);
    const markdown = threadToMarkdown(thread);

    expect(markdown.startsWith("# Fixture chat")).toBe(true);
    expect(markdown).toContain("## User\n\nHello there");
    expect(markdown).toContain("## Assistant\n\nHi! How can I help?");
    expect(markdown).not.toContain("helpful assistant");
    expect(countMessages(thread)).toBe(3);
  });

  it("keeps system messages on request", () => {
    const [thread] = parseChats(CHATGPT);
    expect(threadToMarkdown(thread, { includeSystem: true })).toContain("helpful assistant");
  });

  it("localises the role headings", () => {
    const [thread] = parseChats(CLAUDE);
    const markdown = threadToMarkdown(thread, {
      labels: { user: "用户", assistant: "助手" },
    });
    expect(markdown).toContain("## 用户");
    expect(markdown).toContain("## 助手");
  });

  it("separates multiple conversations", () => {
    const threads = [...parseChats(CLAUDE), ...parseChats(CHATGPT)];
    const markdown = chatsToMarkdown(threads);
    expect(markdown.split("\n---\n")).toHaveLength(2);
  });

  it("rejects empty input", () => {
    expect(() => parseChats("   ")).toThrow();
  });
});
