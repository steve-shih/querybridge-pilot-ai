import { CollectionMetadata } from '../db/internal';
import { Config } from '../config';

export class QueryGuard {
  static async validate(queryStr: string): Promise<string | null> {
    // Basic structural validation
    if (!queryStr.startsWith('db.collection(')) {
      return "Query must start with 'db.collection('";
    }

    const regex = /db\.collection\(['"](.*?)['"]\)\.(.*?)\(/;
    const match = queryStr.match(regex);
    if (!match) return "Invalid query structure.";

    const collectionName = match[1];
    const method = match[2];

    const meta = await CollectionMetadata.findOne({ collectionName });
    if (!meta) {
      return `Collection '${collectionName}' not recognized by querybridge-pilot-ai metadata.`;
    }

    if (meta.isBlacklisted) {
      return `Collection '${collectionName}' is BLACKLISTED and cannot be queried.`;
    }

    // Check method against forbidden syntax
    if (meta.forbiddenSyntax.includes(method)) {
      return `Method '${method}' is forbidden for collection '${collectionName}'. Allowed methods: find(), countDocuments(), etc.`;
    }

    // Advanced nested check could be added here, currently sticking to simple method names
    const lowerQuery = queryStr.toLowerCase();
    for (const forbidden of meta.forbiddenSyntax) {
      if (lowerQuery.includes(`.${forbidden}(`) || lowerQuery.includes(`'${forbidden}'`) || lowerQuery.includes(`"${forbidden}"`)) {
        return `Usage of '${forbidden}' logic detected, which is forbidden.`;
      }
    }

    // New: Check for index usage on large collections
    const indexError = await this.checkIndexUsage(collectionName, queryStr, meta);
    if (indexError) return indexError;

    return null; // Passes verification
  }

  private static async checkIndexUsage(collectionName: string, queryStr: string, meta: any): Promise<string | null> {
    const threshold = Config.LARGE_COLLECTION_THRESHOLD;
    if (meta.totalDocs < threshold) return null;

    // Simple parser to find keys inside find({...}) or aggregate([...])
    // This is a naive regex-based approach for the MVP
    const filterMatch = queryStr.match(/\.(?:find|countDocuments|aggregate)\(\s*({.*?})\s*[,)]/s) || queryStr.match(/\.find\(\s*({.*?})\s*\)/s);
    if (!filterMatch) return null; // No filter, might be a full scan find() which we might also want to block eventually

    const filterStr = filterMatch[1];

    // Extract potential keys (e.g. "name":, name:, {name: ...)
    const keys = new Set<string>();
    const keyRegex = /([a-zA-Z0-9_.]+)\s*:/g;
    let k;
    while ((k = keyRegex.exec(filterStr)) !== null) {
      keys.add(k[1].replace(/['"]/g, ''));
    }

    if (keys.size === 0 && meta.totalDocs >= threshold) {
      return `Query on large collection '${collectionName}' (${meta.totalDocs} docs) must include a filter on an indexed field.`;
    }

    // Check if any key matches an index
    const indexedFields = new Set<string>();
    (meta.indexes || []).forEach((idx: any) => {
      if (idx.key) {
        Object.keys(idx.key).forEach(fieldName => indexedFields.add(fieldName));
      }
    });

    let usesIndex = false;
    for (const key of keys) {
      if (indexedFields.has(key)) {
        usesIndex = true;
        break;
      }
    }

    if (!usesIndex) {
      return `Performance Guard: Collection '${collectionName}' is large (${meta.totalDocs} docs). Your query does not appear to use any indexed fields (${Array.from(indexedFields).join(', ') || 'none found'}). High risk of system timeout.`;
    }

    return null;
  }

  static async enforceLimit(collectionName: string, queryStr: string): Promise<string> {
    const meta = await CollectionMetadata.findOne({ collectionName });
    const limit = meta ? (meta.limitSize || Config.DEFAULT_QUERY_LIMIT) : Config.DEFAULT_QUERY_LIMIT;

    // Only apply limit to `find` queries, if they don't already have one
    if (queryStr.includes('.find(') && !queryStr.includes('.limit(') && !queryStr.includes('.count(')) {
      return `${queryStr}.limit(${limit})`;
    }
    return queryStr;
  }
}
