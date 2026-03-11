import { TargetDB } from './db/target';
import { connectInternalDB, AuditLog, CollectionMetadata } from './db/internal';
import { SchemaExplorer } from './core/SchemaExplorer';
import { LLMOrchestrator } from './core/LLMOrchestrator';
import { QueryGuard } from './core/QueryGuard';
import { QueryRunner } from './core/QueryRunner';

export interface DBPilotOptions {
  systemDatabaseUri: string;
  targetDatabaseType?: string;
  targetDatabaseUri: string;
  cloudApiKey: string;
  selectedAiModel?: string;
  requireUserApproval?: boolean;
}

export class DBPilotCore {
  private targetDb: TargetDB;
  private orchestrator: LLMOrchestrator;
  private reqApproval: boolean;
  private targetDatabaseType: string;

  constructor(private options: DBPilotOptions) {
    this.targetDatabaseType = options.targetDatabaseType || 'mongodb';
    this.targetDb = new TargetDB(options.targetDatabaseUri);
    this.orchestrator = new LLMOrchestrator(options.cloudApiKey, options.selectedAiModel || 'claude');
    this.reqApproval = options.requireUserApproval ?? true;
  }

  async initialize() {
    await connectInternalDB(this.options.systemDatabaseUri);
    await this.targetDb.connect();

    // SQL Explorer logic can be conditionally added here, but keep MongoDB default logic per user requirement
    const explorer = new SchemaExplorer(this.targetDb, this.orchestrator);
    await explorer.explore();
  }

  async ask(question: string): Promise<any> {
    const metadatas = await CollectionMetadata.find({ isBlacklisted: { $ne: true } }).lean();
    let generatedQuery = '';
    let errorMessage = '';
    let guardError: string | null = null;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    
    for (let i = 0; i < 3; i++) {
        try {
            const { query, usage } = await this.orchestrator.generateQuery(question, metadatas);
            generatedQuery = query;
            totalInput += usage.inputTokens;
            totalOutput += usage.outputTokens;
            totalCost += usage.costUSD;

            guardError = await QueryGuard.validate(generatedQuery);
            if (!guardError) break; 
        } catch (e: any) {
            errorMessage = e.message;
        }
    }

    const log = await AuditLog.create({
      userQuestion: question,
      generatedQuery: generatedQuery,
      status: this.reqApproval ? 'PENDING_APPROVAL' : (guardError ? 'BLOCKED' : 'EXECUTED_SUCCESS'),
      inputTokens: totalInput,
      outputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      costUSD: totalCost
    });

    if (guardError) {
       await AuditLog.findByIdAndUpdate(log._id, { status: 'BLOCKED', resultSummary: { error: guardError } });
       return { status: 'BLOCKED', message: guardError, query: generatedQuery, costUSD: totalCost };
    }

    if (this.reqApproval) {
       return { status: 'PENDING_APPROVAL', queryId: log._id, query: generatedQuery, costUSD: totalCost, totalTokens: totalInput + totalOutput };
    } else {
       return await this.executeApprovedQuery(log._id.toString());
    }
  }

  async executeApprovedQuery(queryId: string): Promise<any> {
    const log = await AuditLog.findById(queryId);
    if (!log) throw new Error("Query not found.");

    try {
        const match = log.generatedQuery.match(/db\.collection\(['"](.*?)['"]\)/);
        const collectionName = match ? match[1] : '';
        const enforcedQuery = collectionName ? await QueryGuard.enforceLimit(collectionName, log.generatedQuery) : log.generatedQuery;

        const data = await QueryRunner.execute(this.targetDb.getDb(), enforcedQuery);
        
        // New: Summarize results using LLM
        const { summary, usage } = await this.orchestrator.summarizeData(log.userQuestion, data);

        const finalInput = (log.inputTokens || 0) + usage.inputTokens;
        const finalOutput = (log.outputTokens || 0) + usage.outputTokens;
        const finalCost = (log.costUSD || 0) + usage.costUSD;

        await AuditLog.findByIdAndUpdate(queryId, { 
           status: 'EXECUTED_SUCCESS', 
           resultSummary: { count: Array.isArray(data) ? data.length : 1, summary } ,
           inputTokens: finalInput,
           outputTokens: finalOutput,
           totalTokens: finalInput + finalOutput,
           costUSD: finalCost
        });

        return { status: 'EXECUTED_SUCCESS', data, summary, costUSD: finalCost, totalTokens: finalInput + finalOutput };
    } catch (e: any) {
        await AuditLog.findByIdAndUpdate(queryId, { status: 'ERROR', resultSummary: { error: e.message } });
        return { status: 'ERROR', error: e.message };
    }
  }

  async disconnect() {
     await this.targetDb.disconnect();
  }

  updateConfig(apiKey: string, aiModel?: string) {
    this.orchestrator.updateKey(apiKey, aiModel);
  }
}
