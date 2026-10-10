import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "PERPLEXITY_API_KEY is missing in your .env.local file. Please add your real Perplexity API key to fetch live data."
      }, { status: 401 });
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: "You are an expert patent researcher. Provide a concise, highly technical analysis based on the query. Include citations." },
          { role: "user", content: query }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch from Perplexity" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      content: data.choices[0].message.content,
      citations: data.citations || []
    });

  } catch (error) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
