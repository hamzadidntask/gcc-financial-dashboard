import { trpc } from "@/lib/trpc";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { useState } from "react";

const SUGGESTED_PROMPTS = [
  "What's the overall company performance this year?",
  "Which stores are the most profitable and why?",
  "Which stores need immediate attention?",
  "Compare beverage vs food sales performance",
  "What are the biggest cost drivers?",
  "Recommend strategies to improve bottom line",
];

export default function AIInsights() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "You are a GCC financial analyst AI. Help users understand their financial data."
    }
  ]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const content = typeof data === 'string' ? data : String(data);
      setMessages(prev => [...prev, { role: "assistant", content }]);
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I encountered an error: ${error.message}. Please try again.`
      }]);
    }
  });

  const handleSend = (content: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    chatMutation.mutate({ message: content });
  };

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)]">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Financial Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about GCC's financial performance and get AI-powered analysis
        </p>
      </div>
      <AIChatBox
        messages={messages}
        onSendMessage={handleSend}
        isLoading={chatMutation.isPending}
        placeholder="Ask about revenue, profits, store performance, cost analysis..."
        height="calc(100vh - 12rem)"
        emptyStateMessage="Ask me anything about GCC's financial data"
        suggestedPrompts={SUGGESTED_PROMPTS}
      />
    </div>
  );
}
