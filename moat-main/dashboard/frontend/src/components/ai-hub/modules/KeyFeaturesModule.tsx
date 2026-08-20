"use client";

import React, { useState } from "react";
import { AiHubContext } from "../AiHubWorkspace";
import { Button } from "@/components/ui/button";
import { ListTree, Sparkles, Plus, Loader2, Save, Trash2, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@supabase/ssr";

export default function KeyFeaturesModule({ context }: { context: AiHubContext }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [features, setFeatures] = useState<any[]>([]);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleExtract = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const prompt = `Extract the key technical, functional, and structural features from the following text. 
      Format the output EXACTLY as a JSON array of strings. Do not include markdown formatting or explanations, just the raw JSON array.
      Input text: ${input}`;

      const response = await fetch("/api/ai-hub/perplexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) throw new Error("Failed extraction");

      const data = await response.json();
      const output = data.choices[0]?.message?.content || "[]";
      
      let parsed = [];
      try {
        // Attempt to parse JSON response
        const clean = output.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        parsed = JSON.parse(clean);
      } catch (e) {
        // Fallback if not proper JSON
        parsed = output.split("\n").filter((l: string) => l.trim().length > 0).map((l: string) => l.replace(/^[-*0-9.]+\s/, ""));
      }

      setFeatures([
        ...features, 
        ...parsed.map((f: string) => ({ id: Date.now() + Math.random(), text: f, type: "CORE" }))
      ]);
    } catch (error) {
      console.error(error);
      alert("Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (features.length === 0) return;
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const insertData = features.map(f => ({
        user_id: userData.user.id,
        project_id: context.projectId,
        feature_text: f.text,
        feature_type: f.type,
        context_source: "Key Features Extraction"
      }));

      const { error } = await supabase.from("ai_hub_key_features").insert(insertData);
      if (error) throw error;
      alert("Features saved to database!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to save features.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b flex items-center justify-between bg-background">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListTree className="h-5 w-5 text-indigo-600" />
            Key Features Extraction
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Extract core technical, functional, and structural features from patents or descriptions.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6">
        <div className="space-y-4 flex flex-col">
          <label className="text-sm font-semibold">Source Text / Description</label>
          <Textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste patent text, technology description, or research result here..."
            className="flex-1 resize-none bg-background text-sm p-4 min-h-[300px]"
          />
          <Button onClick={handleExtract} disabled={loading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700 w-full font-bold">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Extract Key Features
          </Button>
        </div>

        <div className="space-y-4 flex flex-col bg-muted/10 border rounded-md p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Extracted Features</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => setFeatures([...features, { id: Date.now(), text: "", type: "CORE" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Manual
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-indigo-600 border-indigo-200" onClick={handleSaveAll} disabled={isSaving || features.length === 0}>
                {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                {isSaving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {features.length === 0 ? (
              <div className="text-center p-10 text-muted-foreground text-sm border border-dashed rounded-md bg-background">
                No features extracted yet.
              </div>
            ) : (
              features.map((f, i) => (
                <div key={f.id} className="flex gap-2 items-start bg-background p-3 rounded-md border shadow-sm">
                  <div className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                    #{i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input 
                      value={f.text} 
                      onChange={(e) => {
                        const newF = [...features];
                        newF[i].text = e.target.value;
                        setFeatures(newF);
                      }}
                      className="h-8 text-sm bg-muted/30"
                    />
                    <select 
                      value={f.type} 
                      onChange={(e) => {
                        const newF = [...features];
                        newF[i].type = e.target.value;
                        setFeatures(newF);
                      }}
                      className="border rounded text-xs px-2 py-1 focus:outline-none"
                    >
                      <option value="CORE">Core Feature</option>
                      <option value="FUNCTIONAL">Functional Feature</option>
                      <option value="STRUCTURAL">Structural Feature</option>
                      <option value="OPTIONAL">Optional Feature</option>
                    </select>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setFeatures(features.filter(feat => feat.id !== f.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
