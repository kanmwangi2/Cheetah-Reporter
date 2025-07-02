import React from 'react';
import type { FinancialStatementLine } from '@/types/project';
import { Commentable } from '../comments/Commentable';
import { cn } from '@/lib/utils';

export const formatCurrency = (value: number, currency: string) => {
  const displayCurrency = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const renderLine = (line: FinancialStatementLine, currency: string, isSubLine = false, isBold = false) => {
  if (!line || typeof line.total === 'undefined') return null;

  const hasSubLines = line.subLines && line.subLines.length > 0;
  const boldClass = isBold || line.isBold;

  return (
    <div key={line.id} className={cn(isSubLine ? 'ml-4' : 'mt-4')}>
      <Commentable elementId={line.id}>
        <div className="p-2 rounded-md hover:bg-muted/50 flex justify-between items-center cursor-pointer">
          <span className={cn(boldClass ? 'font-bold' : !hasSubLines && 'font-medium')}>
            {line.label}
          </span>
          <span className={cn('font-mono', boldClass ? 'font-bold' : 'text-muted-foreground')}>
            {formatCurrency(line.total, currency)}
          </span>
        </div>
      </Commentable>
      {hasSubLines && (
        <div className="mt-1 border-l-2 border-muted/50 pl-2">
          {line.subLines?.map(subLine => renderLine(subLine, currency, true))}
        </div>
      )}
    </div>
  );
};
