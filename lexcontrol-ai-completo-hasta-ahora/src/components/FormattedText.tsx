import React from "react";

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  // Split lines
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentListItems: React.ReactNode[] = [];
  let currentListType: "ul" | "ol" | "none" = "none";

  const renderInlineStyles = (rawStr: string): React.ReactNode => {
    if (!rawStr) return "";
    // Match inline bold: **text**
    const parts = rawStr.split("**");
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-extrabold text-charcoal">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const flushList = (keyPrefix: string) => {
    if (currentListItems.length > 0) {
      if (currentListType === "ul") {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="list-disc pl-5 my-2.5 space-y-1.5 font-sans text-xs text-charcoalSoft leading-relaxed">
            {currentListItems}
          </ul>
        );
      } else if (currentListType === "ol") {
        elements.push(
          <ol key={`ol-${keyPrefix}`} className="list-decimal pl-5 my-2.5 space-y-1.5 font-sans text-xs text-charcoalSoft leading-relaxed">
            {currentListItems}
          </ol>
        );
      }
      currentListItems = [];
      currentListType = "none";
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const origLine = lines[i];
    const trimmed = origLine.trim();

    if (trimmed === "") {
      flushList(`line-${i}`);
      // Push minor vertical spacing for separation
      elements.push(<div key={`space-${i}`} className="h-1" />);
      continue;
    }

    // Check for unordered bullets: -, *, •
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (currentListType !== "ul") {
        flushList(`line-${i}`);
        currentListType = "ul";
      }
      currentListItems.push(
        <li key={`li-ul-${i}`} className="pl-1 select-text">
          {renderInlineStyles(ulMatch[1])}
        </li>
      );
      continue;
    }

    // Check for ordered list: 1. or 1)
    const olMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (olMatch) {
      if (currentListType !== "ol") {
        flushList(`line-${i}`);
        currentListType = "ol";
      }
      currentListItems.push(
        <li key={`li-ol-${i}`} className="pl-1 select-text">
          {renderInlineStyles(olMatch[2])}
        </li>
      );
      continue;
    }

    // If it's a regular line, flush any open list first
    flushList(`line-${i}`);
    
    // Check if it's a heading-like or strong intro line (wrapped in bold entirely)
    const isHeaderStyle = trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4;
    if (isHeaderStyle) {
      const headerText = trimmed.substring(2, trimmed.length - 2);
      elements.push(
        <h5 key={`h5-${i}`} className="font-serif font-bold text-xs text-[#8D2531] mt-3.5 mb-1.5 leading-snug">
          {headerText}
        </h5>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-xs leading-relaxed text-charcoalSoft font-sans mb-1 text-justify select-text">
          {renderInlineStyles(origLine)}
        </p>
      );
    }
  }

  // Flush any final list items remaining
  flushList("final");

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
