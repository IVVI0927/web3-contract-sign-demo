import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TooltipCardProps {
  title: string;
  content: string;
  lawReference?: string;
}

const TooltipCard: React.FC<TooltipCardProps> = ({ title, content, lawReference }) => {
  return (
    <div className="w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-primary-500 mt-0.5" />
        <div className="ml-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{content}</p>
          {lawReference && (
            <div className="mt-2">
              <a
                href={`/laws/${lawReference}`}
                className="text-xs text-primary-600 hover:text-primary-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                View related law →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TooltipCard; 