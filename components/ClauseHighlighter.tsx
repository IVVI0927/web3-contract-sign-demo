import React, { useState } from 'react';
import TooltipCard from './TooltipCard';

interface Clause {
  text: string;
  type: string;
  explanation: string;
  lawReference?: string;
}

interface ClauseHighlighterProps {
  text: string;
  clauses: Clause[];
}

const ClauseHighlighter: React.FC<ClauseHighlighterProps> = ({ text, clauses }) => {
  const [activeClause, setActiveClause] = useState<Clause | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const highlightText = () => {
    let result = text;
    let offset = 0;

    // Sort clauses by their position in the text to handle overlapping matches
    const sortedClauses = [...clauses].sort((a, b) => 
      text.indexOf(a.text) - text.indexOf(b.text)
    );

    sortedClauses.forEach(clause => {
      const startIndex = result.indexOf(clause.text, offset);
      if (startIndex !== -1) {
        const before = result.slice(0, startIndex);
        const after = result.slice(startIndex + clause.text.length);
        const highlighted = (
          <span
            key={startIndex}
            className="bg-yellow-200 cursor-pointer hover:bg-yellow-300 transition-colors"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPosition({
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY + 10,
              });
              setActiveClause(clause);
            }}
            onMouseLeave={() => setActiveClause(null)}
          >
            {clause.text}
          </span>
        );
        result = before + highlighted + after;
        offset = startIndex + clause.text.length;
      }
    });

    return result;
  };

  return (
    <div className="relative">
      <div className="prose max-w-none">
        {highlightText()}
      </div>
      {activeClause && (
        <div
          className="fixed z-50"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <TooltipCard
            title={activeClause.type}
            content={activeClause.explanation}
            lawReference={activeClause.lawReference}
          />
        </div>
      )}
    </div>
  );
};

export default ClauseHighlighter; 