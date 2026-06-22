import mongoose, { Schema, Document } from 'mongoose';

export interface ISearchQuery extends Document {
  query: string;
  count: number;
  recentCount: number;
  score: number;
  lastSearchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SearchQuerySchema: Schema = new Schema(
  {
    query: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    recentCount: {
      type: Number,
      required: true,
      default: 0
    },
    score: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    lastSearchedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true, // Auto-manages createdAt and updatedAt fields
    collection: 'search_queries'
  }
);

// Compound or single index for optimal typeahead querying
// Since prefix query runs on { query } and matches are sorted by { score: -1 },
// an index on separate indexes for { score: -1 } is highly beneficial.
SearchQuerySchema.index({ count: -1 });
SearchQuerySchema.index({ score: -1 });

export const SearchQuery = mongoose.model<ISearchQuery>('SearchQuery', SearchQuerySchema);
