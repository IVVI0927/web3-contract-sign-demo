import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';

interface Law {
  id: string;
  title: string;
  content: string;
  category: string;
  references: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Read laws from JSON file
    const lawsPath = path.join(process.cwd(), 'public/data/laws.json');
    const lawsData = JSON.parse(fs.readFileSync(lawsPath, 'utf8'));

    const { query, category } = req.query;

    let results = lawsData;

    // Filter by category if provided
    if (category) {
      results = results.filter((law: Law) => law.category === category);
    }

    // Search by query if provided
    if (query) {
      const fuse = new Fuse(results, {
        keys: ['title', 'content'],
        threshold: 0.3,
      });

      results = fuse.search(query as string).map((result) => result.item);
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching laws:', error);
    return res.status(500).json({ message: 'Error fetching laws' });
  }
} 