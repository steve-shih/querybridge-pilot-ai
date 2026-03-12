import { TargetDB } from '../db/target';
import { CollectionMetadata, AuditLog } from '../db/internal';
import { LLMOrchestrator } from './LLMOrchestrator';
import { Config } from '../config';

export class SchemaExplorer {
  constructor(
    private targetDb: TargetDB,
    private orchestrator: LLMOrchestrator
  ) { }

  async explore(): Promise<void> {
    console.log("[querybridge-pilot-ai] Starting Schema Exploration...");
    const collections = await this.targetDb.getCollections();
    console.log(`[querybridge-pilot-ai] Found ${collections.length} collections:`, collections);

    if (collections.length === 0) {
      console.warn("[querybridge-pilot-ai] No collections found in target DB.");
      return;
    }

    const existingMetas = await CollectionMetadata.find({});
    const needsExploration: string[] = [];
    for (const name of collections) {
      if (name.startsWith('system.')) continue;
      const meta = existingMetas.find(m => m.collectionName === name);
      const isPlaceholder = meta?.businessPurpose?.includes("尚未生成分析") || meta?.businessPurpose?.includes("AI failed");
      if (!meta || !meta.businessPurpose || isPlaceholder || !meta.techSchema || meta.totalDocs === undefined || meta.indexes === undefined) {
        needsExploration.push(name);
      }
    }

    if (needsExploration.length === 0) {
      console.log("[querybridge-pilot-ai] All collections explored. Skipping AI calls.");
      return;
    }

    for (const colName of needsExploration) {
      // Ensure we don't have duplicates
      await CollectionMetadata.deleteOne({ collectionName: colName });
      try {
        console.log(`[querybridge-pilot-ai] Sampling ${colName}... (limit: ${Config.SAMPLE_SIZE})`);
        const samples = await this.targetDb.sampleCollection(colName, Config.SAMPLE_SIZE);
        console.log(`[querybridge-pilot-ai]   Got ${samples.length} sample docs from ${colName}`);

        console.log(`[querybridge-pilot-ai] Fetching Indexes and Stats for ${colName}...`);
        const indexes = await this.targetDb.getIndexes(colName);
        const totalDocs = await this.targetDb.getEstimatedCount(colName);
        console.log(`[querybridge-pilot-ai]   Found ${indexes.length} indexes, approx ${totalDocs} docs`);

        console.log(`[querybridge-pilot-ai] Generating AI Metadata for ${colName}...`);
        const { businessPurpose, techSchema, schemaDescription, relatedCollections, usage } = await this.orchestrator.describeSchema(colName, samples, indexes);
        console.log(`[querybridge-pilot-ai]   AI Description (first 80 chars): ${(businessPurpose || '').slice(0, 80)}`);
        console.log(`[querybridge-pilot-ai]   Exploration Cost: $${usage.costUSD.toFixed(4)}`);

        await CollectionMetadata.create({
          collectionName: colName,
          businessPurpose,
          techSchema,
          schemaDescription,
          relatedCollections,
          forbiddenSyntax: ['delete', 'update', 'insert', 'drop'],
          limitSize: Config.DEFAULT_QUERY_LIMIT,
          indexes,
          totalDocs
        });

        // New: Persist exploration cost to audit log so it shows up in dashboard
        await AuditLog.create({
          userQuestion: `[SYSTEM] Exploration: ${colName}`,
          status: 'EXECUTED_SUCCESS',
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.inputTokens + usage.outputTokens,
          costUSD: usage.costUSD,
          resultSummary: { type: 'SCHEMA_EXPLORE', collection: colName }
        });

        console.log(`[querybridge-pilot-ai] ✅ Saved Metadata for ${colName}`);
      } catch (err: any) {
        console.error(`[querybridge-pilot-ai] ❌ Failed to explore ${colName}:`, err.message);
        // Still create a basic entry so the user sees it in Schema Manager
        try {
          await CollectionMetadata.create({
            collectionName: colName,
            businessPurpose: `(Auto-detected. AI failed: ${err.message})`,
            techSchema: "N/A",
            schemaDescription: "Analysis failed.",
            relatedCollections: [],
            forbiddenSyntax: ['delete', 'update', 'insert', 'drop'],
            limitSize: Config.DEFAULT_QUERY_LIMIT,
            indexes: [],
            totalDocs: 0
          });
        } catch (_) { /* ignore */ }
      }
    }
    console.log("[querybridge-pilot-ai] Schema Exploration Complete");
  }
}
