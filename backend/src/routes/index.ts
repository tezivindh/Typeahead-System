import { Router } from 'express';
import { suggestController } from '../controllers/suggest.controller';
import { searchController } from '../controllers/search.controller';
import { getCacheStats, getCacheDebug, toggleCacheNode } from '../controllers/cache.controller';
import { getTrendingController } from '../controllers/trending.controller';
import { getMetrics } from '../controllers/metrics.controller';
import { loadDataset, simulateWorkload } from '../controllers/admin.controller';

const router = Router();

// Core Autocomplete Suggestion API
router.get('/suggest', suggestController);

// Search Query Submission API
router.post('/search', searchController);

// Trending Searches API
router.get('/trending', getTrendingController);

// Consistent Hash Ring Cache APIs
router.get('/cache/stats', getCacheStats);
router.get('/cache/debug', getCacheDebug);
router.post('/cache/node/toggle', toggleCacheNode);

// Telemetry & Metrics API
router.get('/metrics', getMetrics);

// Admin & Performance Simulation APIs
router.post('/admin/load-dataset', loadDataset);
router.post('/admin/simulate-workload', simulateWorkload);

export default router;
