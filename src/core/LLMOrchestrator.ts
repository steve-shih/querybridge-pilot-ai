import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Config } from '../config';

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
        openaiConfig.baseURL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
        openaiConfig.apiKey = "ollama";
      }
      this.openai = new OpenAI(openaiConfig);
    }
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const m = model.toLowerCase();
    const i = Number(inputTokens) || 0;
    const o = Number(outputTokens) || 0;

    // Current rough pricing per 1M tokens
    // Claude 3.5 Sonnet: $3/$15
    if (m.includes('claude-3-5-sonnet')) return (i * 3 / 1000000) + (o * 15 / 1000000);
    // GPT-4o: $5/$15
    if (m.includes('gpt-4o') && !m.includes('mini')) return (i * 5 / 1000000) + (o * 15 / 1000000);
    // GPT-4o-mini: $0.15/$0.6
    if (m.includes('gpt-4o-mini')) return (i * 0.15 / 1000000) + (o * 0.6 / 1000000);

    return 0; // Local or unknown models
  }

  async describeSchema(collectionName: string, samples: any[], indexes: any[]): Promise<{ businessPurpose: string, techSchema: string, schemaDescription: string, relatedCollections: string[], usage: any }> {
    const prompt = `You are a Senior Database Architect. Analyze the following MongoDB collection and its sample data (latest 10 docs).

Goal: Help a user understand what is inside this database and how to query it.

Task:
1. "businessDescription": 以繁體中文(Traditional Chinese)說明此資料集的「業務核心重點」與用途。
2. "technicalSchema": A structured summary of important fields, their types, and brief technical meanings.
3. "schemaDescription": A technical deep-dive into the schema structure, covering nesting, relationship keys, and indexing hints.
4. "relatedCollections": List potential linkable collections.

Collection Name: ${collectionName}
Sample Data: ${JSON.stringify(samples, null, 2)}
Indexes: ${JSON.stringify(indexes, null, 2)}

Return strictly in JSON format:
{
  "businessDescription": "...",
  "technicalSchema": "...",
  "schemaDescription": "...",
  "relatedCollections": ["..."]
}`;

    const usage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
    try {
      if (this.aiModel === 'claude' && this.anthropic) {
        const mName = Config.MODELS.CLAUDE;
        const response = await this.anthropic.messages.create({
          model: mName,
          max_tokens: 2000,
          system: "You are a DB expert. Formulate your response as a valid JSON object only.",
          messages: [{ role: "user", content: prompt }]
        }, { timeout: Config.LLM_TIMEOUT });
        const textBlock = response.content.find((block: any) => block.type === 'text');
        let text = (textBlock as any)?.text || '{}';

        usage.inputTokens = response.usage.input_tokens;
        usage.outputTokens = response.usage.output_tokens;
        usage.costUSD = this.calculateCost(mName, usage.inputTokens, usage.outputTokens);

        text = text.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
        const result = JSON.parse(text);
        return {
          businessPurpose: result.businessDescription || '',
          techSchema: result.technicalSchema || '',
          schemaDescription: result.schemaDescription || '',
          relatedCollections: result.relatedCollections || [],
          usage
        };
      } else if (this.openai) {
        const mModel = this.aiModel === 'ollama' ? Config.MODELS.OLLAMA_FALLBACK : Config.MODELS.GPT4O_MINI;
        const response = await this.openai.chat.completions.create({
          model: mModel,
          messages: [{ role: "system", content: "You are a DB expert. Return JSON." }, { role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }, { timeout: Config.LLM_TIMEOUT });
        const result = JSON.parse(response.choices[0].message.content || '{}');

        if (response.usage) {
          usage.inputTokens = response.usage.prompt_tokens;
          usage.outputTokens = response.usage.completion_tokens;
          usage.costUSD = this.calculateCost(mModel, usage.inputTokens, usage.outputTokens);
        }

        return {
          businessPurpose: result.businessDescription || '',
          techSchema: result.technicalSchema || '',
          schemaDescription: result.schemaDescription || '',
          relatedCollections: result.relatedCollections || [],
          usage
        };
      }
    } catch (error) {
      console.error("[LLM] Describe schema error", error);
      throw error;
    }
    return { businessPurpose: "尚未生成分析。", techSchema: "Unknown.", schemaDescription: "No insight.", relatedCollections: [], usage };
  }

  async generateQuery(question: string, metadatas: any[]): Promise<{ query: string, usage: any }> {
    const prompt = `You are an expert MongoDB Query Generator. Convert the user's natural language question into a MongoDB Node.js driver query string.
The query should be executable inside \`db.collection('...').METHOD(...)\`, so return ONLY the exact JavaScript code block starting with \`db.collection\`, and nothing else. NO markdown tags like \`\`\`javascript.

Allowed Collections and Rich Metadata:
${JSON.stringify(metadatas.map(m => ({
      collection: m.collectionName,
      purpose: m.businessPurpose,
      fields: m.techSchema,
      structure: m.schemaDescription,
      related: m.relatedCollections,
      indexes: m.indexes,
      totalDocs: m.totalDocs
    })), null, 2)}

User Question: ${question}

Instructions:
1. Examine "structure" for nested objects or arrays.
2. Examine "fields" for correct data types.
3. If the user question is NOT related to the database schema, business context provided, or data analysis, return ONLY the string "查詢不到".
4. PREFER using indexed fields (listed in "indexes") in the find() or aggregate() filters to ensure performance.
5. Otherwise, generate ONLY the JS query code (e.g. \`db.collection('users').find({ age: { $gt: 18 } })\`). DO NOT append limit.`;

    const usage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
    try {
      let code = '';
      if (this.aiModel === 'claude' && this.anthropic) {
        const mName = Config.MODELS.CLAUDE;
        const response = await this.anthropic.messages.create({
          model: mName,
          max_tokens: 1000,
          system: "You are an expert MongoDB Query Generator. Output EXACTLY raw query javascript code.",
          messages: [{ role: "user", content: prompt }]
        }, { timeout: Config.LLM_TIMEOUT });
        const textBlock = response.content.find((block: any) => block.type === 'text');
        code = (textBlock as any)?.text || '';
        usage.inputTokens = response.usage.input_tokens;
        usage.outputTokens = response.usage.output_tokens;
        usage.costUSD = this.calculateCost(mName, usage.inputTokens, usage.outputTokens);
      } else if (this.openai) {
        const mModel = this.aiModel === 'ollama' ? Config.MODELS.OLLAMA_FALLBACK : Config.MODELS.GPT4O;
        const response = await this.openai.chat.completions.create({
          model: mModel,
          messages: [{ role: "system", content: "You are an expert MongoDB Query Generator. Output EXACTLY raw JS queries without backticks." }, { role: "user", content: prompt }]
        }, { timeout: Config.LLM_TIMEOUT });
        code = response.choices[0].message.content || '';
        if (response.usage) {
          usage.inputTokens = response.usage.prompt_tokens;
          usage.outputTokens = response.usage.completion_tokens;
          usage.costUSD = this.calculateCost(mModel, usage.inputTokens, usage.outputTokens);
        }
      }
      return {
        query: code.replace(/^```[a-z]*|```$/gm, '').trim(),
        usage
      };
    } catch (error) {
      console.error("[LLM] Generate query error", error);
      throw error;
    }
  }

  async summarizeData(question: string, data: any): Promise<{ summary: string, usage: any }> {
    const prompt = `You are a data analyst. Based on the user's question and the retrieved data from the database, provide a concise and professional summary in Traditional Chinese.
User Question: ${question}
Retrieved Data: ${JSON.stringify(data, null, 2)}

Summary:`;

    const usage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
    try {
      if (this.aiModel === 'claude' && this.anthropic) {
        const mName = Config.MODELS.CLAUDE;
        const response = await this.anthropic.messages.create({
          model: mName,
          max_tokens: 500,
          system: "You are a helpful data analyst. Summarize results clearly and concisely.",
          messages: [{ role: "user", content: prompt }]
        }, { timeout: Config.LLM_TIMEOUT });
        const textBlock = response.content.find((block: any) => block.type === 'text');
        usage.inputTokens = response.usage.input_tokens;
        usage.outputTokens = response.usage.output_tokens;
        usage.costUSD = this.calculateCost(mName, usage.inputTokens, usage.outputTokens);
        return { summary: (textBlock as any)?.text || '', usage };
      } else if (this.openai) {
        const mModel = this.aiModel === 'ollama' ? Config.MODELS.OLLAMA_FALLBACK : Config.MODELS.GPT4O_MINI;
        const response = await this.openai.chat.completions.create({
          model: mModel,
          messages: [{ role: "system", content: "You are a data analyst." }, { role: "user", content: prompt }]
        }, { timeout: Config.LLM_TIMEOUT });
        if (response.usage) {
          usage.inputTokens = response.usage.prompt_tokens;
          usage.outputTokens = response.usage.completion_tokens;
          usage.costUSD = this.calculateCost(mModel, usage.inputTokens, usage.outputTokens);
        }
        return { summary: response.choices[0].message.content || '', usage };
      }
    } catch (error) {
      console.error("[LLM] Summarize data error", error);
    }
    return { summary: "無法生成資料總結。", usage };
  }

  updateKey(apiKey: string, aiModel?: string) {
    if (aiModel) this.aiModel = aiModel;
    if (this.aiModel === 'claude') {
      this.anthropic = new Anthropic({ apiKey });
      this.openai = undefined;
    } else {
      const openaiConfig: any = { apiKey };
      if (this.aiModel === 'ollama') {
        openaiConfig.baseURL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
        openaiConfig.apiKey = "ollama";
      }
      this.openai = new OpenAI(openaiConfig);
      this.anthropic = undefined;
    }
  }
}
