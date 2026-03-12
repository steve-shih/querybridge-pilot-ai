import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  targetDatabaseUri: string;
  targetDatabaseType: string;
  cloudApiKey: string;
  selectedAiModel: string;
  requireUserApproval: boolean;
}

const SystemConfigSchema = new Schema<ISystemConfig>({
  targetDatabaseUri: { type: String, required: true },
  targetDatabaseType: { type: String, default: 'mongodb' },
  cloudApiKey: { type: String, required: true },
  selectedAiModel: { type: String, default: 'claude' },
  requireUserApproval: { type: Boolean, default: true }
});

export const SystemConfig = mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);

export interface ICollectionMetadata extends Document {
  collectionName: string;
  businessPurpose: string;
  techSchema: string;
  schemaDescription: string;
  relatedCollections: string[];
  forbiddenSyntax: string[];
  limitSize: number;
  isBlacklisted: boolean;
  indexes: any[];
  totalDocs: number;
}

const CollectionMetadataSchema = new Schema<ICollectionMetadata>({
  collectionName: { type: String, required: true, unique: true },
  businessPurpose: { type: String, default: '' },
  techSchema: { type: String, default: '' },
  schemaDescription: { type: String, default: '' },
  relatedCollections: { type: [String], default: [] },
  forbiddenSyntax: { type: [String], default: ['delete', 'update', 'insert', 'drop', 'aggregate'] },
  limitSize: { type: Number, default: 50 },
  isBlacklisted: { type: Boolean, default: false },
  indexes: { type: Schema.Types.Mixed, default: [] },
  totalDocs: { type: Number, default: 0 }
});

export const CollectionMetadata = mongoose.models.CollectionMetadata || mongoose.model<ICollectionMetadata>('CollectionMetadata', CollectionMetadataSchema);

export interface IAuditLog extends Document {
  timestamp: Date;
  userQuestion: string;
  generatedQuery: string;
  status: 'PENDING_APPROVAL' | 'EXECUTED_SUCCESS' | 'BLOCKED' | 'ERROR';
  resultSummary?: any;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUSD?: number;
  deleted: boolean;
}

const AuditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Date, default: Date.now },
  userQuestion: { type: String, required: true },
  generatedQuery: { type: String, default: '' },
  status: { type: String, enum: ['PENDING_APPROVAL', 'EXECUTED_SUCCESS', 'BLOCKED', 'ERROR'], required: true },
  resultSummary: { type: Schema.Types.Mixed },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  costUSD: { type: Number, default: 0 },
  deleted: { type: Boolean, default: false }
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export const connectInternalDB = async (uri: string) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log(`[querybridge-pilot-ai] Internal DB connected at ${uri}`);
  }
};
