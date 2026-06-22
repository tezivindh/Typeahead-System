import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { logger } from '../utils/logger';

const WORKSPACE_DIR = '/home/tezivindh/Desktop/Typeahead System';
const OUTPUT_FILE = path.join(WORKSPACE_DIR, 'dataset.csv');
const TSV_FILE = path.join(WORKSPACE_DIR, 'datasets', 'orcas-doctrain-queries.tsv');

// Fallback base data
const bases = [
  'iphone', 'samsung', 'macbook', 'ipad', 'dell', 'lenovo', 'hp', 'asus', 'acer', 'sony',
  'playstation', 'xbox', 'nintendo', 'pixel', 'oneplus', 'xiaomi', 'huawei', 'lg', 'bose',
  'python', 'javascript', 'typescript', 'react', 'nextjs', 'angular', 'vue', 'nodejs', 'express',
  'django', 'flask', 'spring boot', 'laravel', 'ruby on rails', 'html', 'css', 'sass', 'tailwind',
  'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'cassandra', 'dynamodb', 'firebase',
  'docker', 'kubernetes', 'jenkins', 'ansible', 'terraform', 'git', 'github', 'gitlab', 'vscode',
  'nike', 'adidas', 'puma', 'under armour', 'reebok', 'vans', 'converse', 'jordan', 'levi',
  'coffee', 'tea', 'latte', 'cappuccino', 'espresso', 'pizza', 'burger', 'sushi', 'pasta', 'salad',
  'hotel', 'flight', 'resort', 'cruise', 'car rental', 'airbnb', 'weather', 'news', 'sports',
  'chatgpt', 'openai', 'claude', 'gemini', 'copilot', 'midjourney', 'stable diffusion', 'huggingface',
  'tesla', 'toyota', 'honda', 'ford', 'chevrolet', 'bmw', 'audi', 'mercedes', 'porsche', 'ferrari'
];

const modifiers1 = [
  '15', '14', 'pro', 'max', 'plus', 'ultra', 'galaxy', 'book', 'air', 'studio', 'switch',
  'tutorial', 'course', 'guide', 'basics', 'advanced', 'tips', 'tricks', 'secrets', 'hacks',
  'setup', 'config', 'install', 'download', 'deploy', 'hosting', 'cloud', 'server', 'db',
  'shoes', 'tshirt', 'jeans', 'jacket', 'hoodie', 'sneakers', 'boots', 'socks', 'cap',
  'maker', 'machine', 'recipe', 'sauce', 'dough', 'crust', 'toppings', 'delivery', 'deals',
  'booking', 'prices', 'reviews', 'ratings', 'alternatives', 'comparison', 'vs', 'features',
  'api', 'integration', 'sdk', 'documentation', 'examples', 'code', 'library', 'framework',
  'model', 'app', 'website', 'online', 'free', 'cheap', 'best', 'premium', 'discount', 'sale'
];

const modifiers2 = [
  'price', 'review', 'specs', 'release date', 'colors', 'battery life', 'camera', 'screen',
  'for beginners', 'for developers', 'with examples', 'step by step', 'free download', 'github repo',
  'best deals', 'coupon code', 'promo code', 'discount code', 'near me', 'delivery hours',
  'not working', 'error fix', 'how to solve', 'getting started', 'crash course', 'pdf download',
  'best practices', 'performance optimization', 'security tips', 'cheat sheet', 'interview questions'
];

/**
 * Generates dataset.csv. Extracts from ORCAS TSV if present, otherwise uses synthetic generation.
 */
export async function generateCSV(): Promise<void> {
  if (fs.existsSync(TSV_FILE)) {
    logger.info(`Found ORCAS dataset at: ${TSV_FILE}. Generating real-world query set...`);
    
    const fileStream = fs.createReadStream(TSV_FILE);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const uniqueQueries = new Set<string>();
    const TARGET_LIMIT = 150000;
    
    // Filter regex: alphanumeric, spaces, and standard search characters
    const validQueryRegex = /^[a-zA-Z0-9\s\+\-\#\!\?\'\&\.\/\(\)]+$/;

    for await (const line of rl) {
      if (uniqueQueries.size >= TARGET_LIMIT) {
        break;
      }

      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const queryText = parts[1].trim().toLowerCase();
      
      // Clean query filters
      if (
        queryText.length >= 3 &&
        queryText.length <= 40 &&
        validQueryRegex.test(queryText) &&
        !queryText.startsWith('!') &&
        !queryText.startsWith('?') &&
        !queryText.includes('http')
      ) {
        uniqueQueries.add(queryText);
      }
    }

    const queriesArray = Array.from(uniqueQueries);
    const totalCount = queriesArray.length;
    logger.info(`Extracted ${totalCount} unique real-world queries. Formatting count values...`);

    const dataRows: string[] = ['query,count'];
    const C = 500000; // Constant count for top query popularity
    const alpha = 0.85;

    for (let i = 0; i < totalCount; i++) {
      const query = queriesArray[i];
      const count = Math.max(1, Math.round(C / Math.pow(i + 1, alpha)));
      const escapedQuery = query.includes(',') ? `"${query}"` : query;
      dataRows.push(`${escapedQuery},${count}`);
    }

    fs.writeFileSync(OUTPUT_FILE, dataRows.join('\n'));
    logger.info(`Dataset written to: ${OUTPUT_FILE}`);
    logger.info(`Total records: ${totalCount}`);
    return;
  }

  // Fallback to original synthetic generator if TSV does not exist
  logger.warn(`ORCAS TSV not found at: ${TSV_FILE}. Generating synthetic dataset...`);
  
  const uniqueQueries = new Set<string>();
  const dataRows: string[] = [];

  for (const base of bases) {
    uniqueQueries.add(base);
  }

  for (const base of bases) {
    for (const mod1 of modifiers1) {
      uniqueQueries.add(`${base} ${mod1}`);
    }
  }

  for (const base of bases) {
    for (const mod1 of modifiers1) {
      const sliceSize = 14;
      const startIdx = (base.charCodeAt(0) + mod1.charCodeAt(0)) % (modifiers2.length - sliceSize);
      const selectedMods = modifiers2.slice(startIdx, startIdx + sliceSize);
      
      for (const mod2 of selectedMods) {
        uniqueQueries.add(`${base} ${mod1} ${mod2}`);
      }
    }
  }

  const queriesArray = Array.from(uniqueQueries);
  const totalCount = queriesArray.length;
  logger.info(`Generated ${totalCount} unique synthetic queries. Formatting counts...`);

  dataRows.push('query,count');
  const C = 200000;
  const alpha = 0.85;

  for (let i = 0; i < totalCount; i++) {
    const query = queriesArray[i];
    const count = Math.max(1, Math.round(C / Math.pow(i + 1, alpha)));
    const escapedQuery = query.includes(',') ? `"${query}"` : query;
    dataRows.push(`${escapedQuery},${count}`);
  }

  fs.writeFileSync(OUTPUT_FILE, dataRows.join('\n'));
  logger.info(`Synthetic dataset written to: ${OUTPUT_FILE}`);
  logger.info(`Total records: ${totalCount}`);
}

// Executed directly
if (require.main === module) {
  generateCSV()
    .then(() => logger.info('Done'))
    .catch((err) => logger.error('Error:', err));
}
