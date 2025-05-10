interface Clause {
  text: string;
  type: string;
  explanation: string;
  lawReference?: string;
}

const RISK_KEYWORDS = {
  'NDA': {
    patterns: [
      /confidentiality/i,
      /non-disclosure/i,
      /trade secret/i,
    ],
    explanation: 'Non-disclosure agreements protect confidential information and trade secrets.',
    lawReference: 'contract-law-nda',
  },
  'Indemnity': {
    patterns: [
      /indemnify/i,
      /indemnification/i,
      /hold harmless/i,
    ],
    explanation: 'Indemnity clauses require one party to compensate the other for losses or damages.',
    lawReference: 'contract-law-indemnity',
  },
  'Termination': {
    patterns: [
      /termination/i,
      /terminate/i,
      /breach/i,
      /default/i,
    ],
    explanation: 'Termination clauses specify conditions under which the contract can be ended.',
    lawReference: 'contract-law-termination',
  },
  'Liability': {
    patterns: [
      /liability/i,
      /damages/i,
      /limitation of liability/i,
    ],
    explanation: 'Liability clauses define the extent of responsibility for damages or losses.',
    lawReference: 'contract-law-liability',
  },
  'Jurisdiction': {
    patterns: [
      /jurisdiction/i,
      /governing law/i,
      /venue/i,
    ],
    explanation: 'Jurisdiction clauses determine which laws and courts will govern the contract.',
    lawReference: 'contract-law-jurisdiction',
  },
};

export const findClauses = (text: string): Clause[] => {
  const clauses: Clause[] = [];

  Object.entries(RISK_KEYWORDS).forEach(([type, config]) => {
    config.patterns.forEach(pattern => {
      const matches = text.match(new RegExp(pattern, 'g'));
      if (matches) {
        matches.forEach(match => {
          // Get some context around the match
          const startIndex = Math.max(0, text.indexOf(match) - 50);
          const endIndex = Math.min(text.length, text.indexOf(match) + match.length + 50);
          const context = text.slice(startIndex, endIndex);

          clauses.push({
            text: match,
            type,
            explanation: config.explanation,
            lawReference: config.lawReference,
          });
        });
      }
    });
  });

  return clauses;
};

// Optional: Add LLM-based clause detection
export const detectClausesWithLLM = async (text: string): Promise<Clause[]> => {
  // This would be implemented when integrating with an LLM service
  // For now, return empty array
  return [];
}; 