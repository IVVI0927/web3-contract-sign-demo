import type { NextApiRequest, NextApiResponse } from 'next';
import { findClauses, detectClausesWithLLM } from '../../lib/clauseMatcher';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, useLLM } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    let clauses;

    if (useLLM) {
      // Use LLM for more sophisticated clause detection
      clauses = await detectClausesWithLLM(text);
    } else {
      // Use pattern matching for basic clause detection
      clauses = findClauses(text);
    }

    return res.status(200).json({ clauses });
  } catch (error) {
    console.error('Error parsing contract:', error);
    return res.status(500).json({ message: 'Error parsing contract' });
  }
} 