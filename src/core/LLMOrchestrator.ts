import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class LLMOrchestrator {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private aiModel: string;

  constructor(apiKey: string, aiModel: string = 'claude') {
    this.aiModel = aiModel;
    if (aiModel === 'claude') {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      // Setup OpenAI API (Or Ollama via OpenAI compatible endpoint)
      const openaiConfig: any = { apiKey };
      if (aiModel === 'ollama') {
         // Placeholder logic for future Ollama expansion which is often locally hosted via OpenAI compatible API
         openaiConfig.baseURL = "http://127.0.0.1:11434/v1";
         openaiConfig.apiKey = "ollama";
      }
      this.openai = new OpenAI(openaiConfig);
    }
  }

  async describeSchema(collectionName: string, samples: any[]): Promise<{ businessPurpose: string, techSchema: string, schemaDescription: string, relatedCollections: string[] }> {
    const prompt = `You are a Senior Database Architect. Analyze the following MongoDB collection and its sample data (latest 10 docs).

Goal: Help a user understand what is inside this database and how to query it.

Task:
1. "businessDescription": 以繁體中文(Traditional Chinese)說明此資料集的「業務核心重點」與用途。
2. "technicalSchema": A structured summary of important fields, their types, and brief technical meanings.
3. "schemaDescription": A technical deep-dive into the schema structure, covering nesting, relationship keys, and indexing hints.
4. "relatedCollections": List potential linkable collections.

Collection Name: ${collectionName}
Sample Data: ${JSON.stringify(samples, null, 2)}

Return strictly in JSON format:
{
  "businessDescription": "...",
  "technicalSchema": "...",
  "schemaDescription": "...",
  "relatedCollections": ["..."]
}`;

    try {
      if (this.aiModel === 'claude' && this.anthropic) {
          const response = await this.anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2000,
              system: "You are a DB expert. Formulate your response as a valid JSON object only.",
              messages: [{ role: "user", content: prompt }]
          });
          const textBlock = response.content.find((block: any) => block.type === 'text');
          let text = (textBlock as any)?.text || '{}';
          text = text.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
          const result = JSON.parse(text);
          return {
            businessPurpose: result.businessDescription || '',
            techSchema: result.technicalSchema || '',
            schemaDescription: result.schemaDescription || '',
            relatedCollections: result.relatedCollections || []
          };
      } else if (this.openai) {
          const mModel = this.aiModel === 'ollama' ? "qwen3:8b" : "gpt-4o-mini";
          const response = await this.openai.chat.completions.create({
            model: mModel,
            messages: [{ role: "system", content: "You are a DB expert. Return JSON." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" }
          });
          const result = JSON.parse(response.choices[0].message.content || '{}');
          return {
            businessPurpose: result.businessDescription || '',
            techSchema: result.technicalSchema || '',
            schemaDescription: result.schemaDescription || '',
            relatedCollections: result.relatedCollections || []
          };
      }
    } catch (error) {
      console.error("[LLM] Describe schema error", error);
    }
    return { businessPurpose: "尚未生成分析。", techSchema: "Unknown.", schemaDescription: "No insight.", relatedCollections: [] };
  }

  async generateQuery(question: string, metadatas: any[]): Promise<string> {
    const prompt = `You are an expert MongoDB Query Generator. Convert the user's natural language question into a MongoDB Node.js driver query string.
The query should be executable inside \`db.collection('...').METHOD(...)\`, so return ONLY the exact JavaScript code block starting with \`db.collection\`, and nothing else. NO markdown tags like \`\`\`javascript.

Allowed Collections and Rich Metadata:
${JSON.stringify(metadatas.map(m => ({
    collection: m.collectionName,
    purpose: m.businessPurpose,
    fields: m.techSchema,
    structure: m.schemaDescription,
    related: m.relatedCollections
})), null, 2)}

User Question: ${question}

Instructions:
1. Examine "structure" for nested objects or arrays.
2. Examine "fields" for correct data types.
3. Generate ONLY the JS query code (e.g. \`db.collection('users').find({ age: { $gt: 18 } })\`). DO NOT append limit.`;

    try {
      let code = '';
      if (this.aiModel === 'claude' && this.anthropic) {
          const response = await this.anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1000,
              system: "You are an expert MongoDB Query Generator. Output EXACTLY raw query javascript code.",
              messages: [{ role: "user", content: prompt }]
          });
          const textBlock = response.content.find((block: any) => block.type === 'text');
          code = (textBlock as any)?.text || '';
      } else if (this.openai) {
          const mModel = this.aiModel === 'ollama' ? "qwen3:8b" : "gpt-4o";
          const response = await this.openai.chat.completions.create({
            model: mModel,
            messages: [{ role: "system", content: "You are an expert MongoDB Query Generator. Output EXACTLY raw JS queries without backticks." }, { role: "user", content: prompt }]
          });
          code = response.choices[0].message.content || '';
      }
      return code.replace(/^```[a-z]*|```$/gm, '').trim();
    } catch (error) {
      console.error("[LLM] Generate query error", error);
      throw error;
    }
  }

  async summarizeData(question: string, data: any): Promise<string> {
    const prompt = `You are a data analyst. Based on the user's question and the retrieved data from the database, provide a concise and professional summary in Traditional Chinese.
User Question: ${question}
Retrieved Data: ${JSON.stringify(data, null, 2)}

Summary:`;

    try {
      if (this.aiModel === 'claude' && this.anthropic) {
          const response = await this.anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 500,
              system: "You are a helpful data analyst. Summarize results clearly and concisely.",
              messages: [{ role: "user", content: prompt }]
          });
          const textBlock = response.content.find((block: any) => block.type === 'text');
          return (textBlock as any)?.text || '';
      } else if (this.openai) {
          const mModel = this.aiModel === 'ollama' ? "qwen3:8b" : "gpt-4o-mini";
          const response = await this.openai.chat.completions.create({
            model: mModel,
            messages: [{ role: "system", content: "You are a data analyst." }, { role: "user", content: prompt }]
          });
          return response.choices[0].message.content || '';
      }
    } catch (error) {
      console.error("[LLM] Summarize data error", error);
    }
    return "無法生成資料總結。";
  }
}
