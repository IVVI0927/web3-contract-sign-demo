import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import ClauseHighlighter from '../components/ClauseHighlighter';
import { findClauses } from '../lib/clauseMatcher';

export default function Home() {
  const [contractText, setContractText] = useState<string>('');
  const [clauses, setClauses] = useState<any[]>([]);

  const handleContentReceived = (content: string) => {
    setContractText(content);
    const detectedClauses = findClauses(content);
    setClauses(detectedClauses);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Legal Document Analyzer
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!contractText ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Upload or Paste Your Contract
              </h2>
              <FileUploader onContentReceived={handleContentReceived} />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Contract Analysis
                  </h2>
                  <button
                    onClick={() => {
                      setContractText('');
                      setClauses([]);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="prose max-w-none">
                  <ClauseHighlighter text={contractText} clauses={clauses} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 