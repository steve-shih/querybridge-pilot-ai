import { CollectionMetadata } from '../db/internal';

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
      return `Collection '${collectionName}' not recognized by DBPilot metadata.`;
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

    return null; // Passes verification
  }

  static async enforceLimit(collectionName: string, queryStr: string): Promise<string> {
    const meta = await CollectionMetadata.findOne({ collectionName });
    const limit = meta ? meta.limitSize : 50;

    // Only apply limit to `find` queries, if they don't already have one
    if (queryStr.includes('.find(') && !queryStr.includes('.limit(') && !queryStr.includes('.count(')) {
       return `${queryStr}.limit(${limit})`;
    }
    return queryStr;
  }
}
