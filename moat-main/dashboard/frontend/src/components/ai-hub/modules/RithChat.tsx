"use client";

import React, { useState, useRef, useEffect } from "react";
import { AiHubContext } from "../AiHubWorkspace";
import { Button } from "@/components/ui/button";
import { 
  Brain, Send, Loader2, User, FileText, Sparkles, ShieldAlert, Scale, Target, 
  Map, Image as ImageIcon, ListTree, FileOutput, History, Bookmark, Lightbulb, ChevronRight
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const AI_TOOLS = [
  { id: "novelty", label: "Novelty Search", description: "Find prior art and analyze novelty against existing technologies.", icon: Sparkles, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { id: "fto", label: "FTO Search", description: "Freedom to Operate analysis to identify potential IP risks.", icon: ShieldAlert, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  { id: "validity", label: "Validity Search", description: "Assess the validity of patents with prior art and legal analysis.", icon: Scale, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { id: "invalidity", label: "Invalidity Search", description: "Find prior art that may invalidate existing patents.", icon: Target, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { id: "landscape", label: "Landscape Search", description: "Explore technology landscape and market trends.", icon: Map, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: "design", label: "Design Search", description: "Search for existing designs and visual similarities.", icon: ImageIcon, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { id: "features", label: "Key Features", description: "Extract and analyze key technical features from your invention.", icon: ListTree, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { id: "pfs", label: "PFS Generator", description: "Generate Patent Filing Strategy based on your research.", icon: FileOutput, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
];

const HISTORY_TOOLS = [
  { id: "history", label: "Search History", description: "View and manage your past searches and results.", icon: History, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", actionLabel: "View" },
  { id: "reports", label: "Saved Reports", description: "Access all your saved reports and research documents.", icon: Bookmark, color: "bg-[#f4ead5] text-[#b08d3a] dark:bg-[#2a2416] dark:text-[#d6b77a]", actionLabel: "View" },
];

export default function RithChat({ context, onSelectTool }: { context: AiHubContext, onSelectTool: (id: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Initial greeting handled implicitly in UI to avoid state hydration mismatch
  }, [context]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || loading) return;
    
    const userMsg: Message = { role: "user", content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideInput) setInput("");
    setLoading(true);

    // After state update, scroll to bottom
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const systemPrompt = `You are Rith, an expert enterprise AI research assistant inside the MOAT AI HUB. You specialize in intellectual property (Patents, Trademarks, Copyrights).
      Context: ${context.projectType ? `${context.projectType} Project - ${context.projectName}` : "General IP Research"}.
      Always be professional, concise, and analytical. Do not invent patent numbers or legal conclusions. Present findings as research.`;

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...newMessages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }))
      ];

      const response = await fetch("/api/ai-hub/perplexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      const output = data.choices[0]?.message?.content || "I couldn't process that request.";
      
      setMessages(prev => [...prev, { role: "assistant", content: output }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error communicating with the research engine." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide relative">
      <div className="max-w-7xl mx-auto w-full p-6 md:p-8 lg:p-12 space-y-12 pb-24">
        
        {/* HERO AREA & CHAT PANEL */}
        <section className="space-y-6">
          <div className="flex justify-between items-end relative z-10">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f3d978] to-[#c9a84c] flex items-center justify-center shadow-md">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                AI Rith Research Assistant
              </h1>
              <p className="text-sm font-semibold text-muted-foreground mt-3 tracking-wide">
                Ask about patents, trademarks, copyrights, prior art, or technology landscapes.
              </p>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-[#c9a84c]/20 via-[#c9a84c]/5 to-transparent blur-[100px] pointer-events-none z-0" />

          <div className="bg-white dark:bg-card border border-border/60 rounded-3xl p-6 lg:p-8 shadow-sm relative z-10">
            {messages.length === 0 ? (
              <div className="flex gap-5 mb-8">
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-[#fdfbf7] dark:bg-amber-900/20 text-[#c9a84c] border border-amber-100 dark:border-amber-900/50 shadow-sm">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 pt-1.5">
                  <p className="text-base font-bold text-foreground">Hello! I am Rith, your AI research assistant for the MOAT AI HUB.</p>
                  <p className="text-sm font-medium text-muted-foreground">How can I help you with your intellectual property research today?</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === "user" ? "bg-amber-100 dark:bg-amber-900/40 text-[#b08d3a]" : "bg-[#fdfbf7] dark:bg-amber-900/20 text-[#c9a84c] border border-amber-100 dark:border-amber-900/50"}`}>
                      {msg.role === "user" ? <User className="h-5 w-5" /> : <Brain className="h-5 w-5" />}
                    </div>
                    <div className={`px-5 py-4 rounded-3xl text-sm font-medium whitespace-pre-wrap leading-relaxed shadow-sm max-w-[85%] ${msg.role === "user" ? "bg-[#c9a84c] text-white rounded-tr-sm" : "bg-muted/30 border border-border/50 text-foreground rounded-tl-sm"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 flex-row">
                    <div className="h-10 w-10 rounded-full bg-[#fdfbf7] dark:bg-amber-900/20 text-[#c9a84c] border border-amber-100 dark:border-amber-900/50 flex items-center justify-center shrink-0 shadow-sm">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div className="px-5 py-4 rounded-3xl rounded-tl-sm text-sm bg-muted/30 border border-border/50 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-[#c9a84c]" />
                      <span className="text-muted-foreground font-semibold">Rith is analyzing the IP landscape...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}

            <div className="flex gap-3 items-end relative">
              <Textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Rith anything about intellectual property..."
                className="min-h-[76px] max-h-[200px] resize-none bg-slate-50 dark:bg-muted/20 border-border/60 focus-visible:ring-[#c9a84c] text-sm py-4 px-5 rounded-2xl font-medium shadow-inner"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim() || loading} className="bg-[#c9a84c] hover:bg-[#b09342] text-white h-[76px] w-[76px] rounded-2xl shadow-md transition-all shrink-0">
                <Send className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Quick Prompts */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-1.5 mr-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#c9a84c]"/> Quick Actions
              </span>
              {[
                "Find prior art for a smart home device",
                "Analyze patentability of an invention",
                "Explain FTO for a product",
                "More suggestions..."
              ].map((prompt, i) => (
                <button 
                  key={prompt} 
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className={`text-[12px] font-bold px-4 py-2 border border-border/60 text-foreground transition-all rounded-full ${i === 3 ? "bg-transparent hover:bg-muted/50 border-dashed text-muted-foreground" : "bg-white dark:bg-card hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-900/50 hover:text-[#c9a84c]"}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* PATENT INTELLIGENCE TOOLS */}
        <section className="space-y-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Patent Intelligence Tools</h2>
            <p className="text-sm font-semibold text-muted-foreground mt-1.5">Choose a specialized tool to start your research and analysis workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {AI_TOOLS.map((tool) => (
              <div 
                key={tool.id} 
                className="group bg-white dark:bg-card border border-border/60 hover:border-[#c9a84c]/50 rounded-[24px] p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full"
                onClick={() => onSelectTool(tool.id)}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${tool.color}`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-[#c9a84c] transition-colors">{tool.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5 font-medium">{tool.description}</p>
                <div className="mt-auto">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-[#c9a84c] uppercase tracking-widest transition-colors">
                    Start <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
             {HISTORY_TOOLS.map((tool) => (
              <div 
                key={tool.id} 
                className="group bg-white dark:bg-card border border-border/60 hover:border-[#c9a84c]/50 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                onClick={() => onSelectTool(tool.id)}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tool.color}`}>
                    <tool.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-[#c9a84c] transition-colors">{tool.label}</h3>
                    <p className="text-sm font-medium text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-[#c9a84c] uppercase tracking-widest transition-colors shrink-0">
                  {tool.actionLabel} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
