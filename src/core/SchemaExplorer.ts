import { TargetDB } from '../db/target';
import { CollectionMetadata } from '../db/internal';
import { LLMOrchestrator } from './LLMOrchestrator';

export class SchemaExplorer {
  constructor(
    private targetDb: TargetDB,
    private orchestrator: LLMOrchestrator
  ) {}

  async explore(): Promise<void> {
    console.log("[DBPilot] Starting Schema Exploration...");
    const collections = await this.targetDb.getCollections();
    console.log(`[DBPilot] Found ${collections.length} collections:`, collections);

    if (collections.length === 0) {
      console.warn("[DBPilot] No collections found in target DB.");
      return;
    }

    const existingMetas = await CollectionMetadata.find({});
    const needsExploration: string[] = [];
    for (const name of collections) {
      if (name.startsWith('system.')) continue;
      const meta = existingMetas.find(m => m.collectionName === name);
      if (!meta || !meta.businessPurpose || !meta.techSchema) {
        needsExploration.push(name);
      }
    }

    if (needsExploration.length === 0) {
      console.log("[DBPilot] All collections explored. Skipping AI calls.");
      return;
    }

    for (const colName of needsExploration) {
      // Ensure we don't have duplicates
      await CollectionMetadata.deleteOne({ collectionName: colName });
      try {
        console.log(`[DBPilot] Sampling ${colName}...`);
        const samples = await this.targetDb.sampleCollection(colName);
        console.log(`[DBPilot]   Got ${samples.length} sample docs from ${colName}`);
        
        console.log(`[DBPilot] Generating AI Metadata for ${colName}...`);
        const info = await this.orchestrator.describeSchema(colName, samples);
        console.log(`[DBPilot]   AI Description (first 80 chars): ${(info.businessPurpose || '').slice(0, 80)}`);
        
        await CollectionMetadata.create({
          collectionName: colName,
          businessPurpose: info.businessPurpose,
          techSchema: info.techSchema,
          schemaDescription: info.schemaDescription,
          relatedCollections: info.relatedCollections,
          forbiddenSyntax: ['delete', 'update', 'insert', 'drop'],
          limitSize: 50
        });

        console.log(`[DBPilot] ✅ Saved Metadata for ${colName}`);
      } catch (err: any) {
        console.error(`[DBPilot] ❌ Failed to explore ${colName}:`, err.message);
        // Still create a basic entry so the user sees it in Schema Manager
        try {
          await CollectionMetadata.create({
            collectionName: colName,
            businessPurpose: `(Auto-detected. AI failed: ${err.message})`,
            techSchema: "N/A",
            schemaDescription: "Analysis failed.",
            relatedCollections: [],
            forbiddenSyntax: ['delete', 'update', 'insert', 'drop'],
            limitSize: 50
          });
        } catch (_) { /* ignore */ }
      }
    }
    console.log("[DBPilot] Schema Exploration Complete");
  }
}
