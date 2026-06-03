import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  className?: string;
  lineClampClass?: string;
  threshold?: number;
}

export function ExpandableText({ text, className, lineClampClass = "truncate", threshold = 30 }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > threshold;

  if (!isLong) {
    return <div className={cn(className, "break-words")}>{text}</div>;
  }

  return (
    <div className={cn(className, "flex flex-col items-start min-w-0")}>
      <div 
        className={cn(
          "w-full break-all",
          !expanded && lineClampClass
        )} 
        title={text}
      >
        {text}
      </div>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(!expanded);
        }} 
        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 mt-0.5 inline-block"
      >
        {expanded ? "view less" : "view more"}
      </button>
    </div>
  );
}
