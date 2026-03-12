import { MongoClient, Db } from 'mongodb';

export class TargetDB {
  private client: MongoClient;
  private db: Db | null = null;

  constructor(private uri: string) {
    this.client = new MongoClient(uri);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db();
    console.log(`[querybridge-pilot-ai] Target DB connected at ${this.uri}`);
  }

  async disconnect() {
    await this.client.close();
  }

  getDb(): Db {
    if (!this.db) throw new Error("Target DB not connected.");
    return this.db;
  }

  async getCollections(): Promise<string[]> {
    const db = this.getDb();
    const collections = await db.listCollections().toArray();
    return collections.map(c => c.name);
  }

  async getIndexes(name: string): Promise<any[]> {
    const db = this.getDb();
    const cols = db.collection(name);
    return await cols.listIndexes().toArray();
  }

  async getEstimatedCount(name: string): Promise<number> {
    const db = this.getDb();
    const cols = db.collection(name);
    return await cols.estimatedDocumentCount();
  }

  async sampleCollection(name: string, limit: number = 5): Promise<any[]> {
    const db = this.getDb();
    const cols = db.collection(name);
    // As per README: "執行 find().sort({_id: -1}).limit(5) 與 find().sort({_id: 1}).limit(5)"
    const latest = await cols.find().sort({ _id: -1 }).limit(limit).toArray();
    const oldest = await cols.find().sort({ _id: 1 }).limit(limit).toArray();

    // Deduplicate logic using _id string representation
    const samplesMap = new Map();
    [...latest, ...oldest].forEach(doc => {
      samplesMap.set(String(doc._id), doc);
    });

    return Array.from(samplesMap.values());
  }
}
