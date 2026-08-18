import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * Robust Math & LaTeX parser and renderer for Tamil + English + Math equations.
 * Supports:
 * - $...$ (inline math, e.g. $x^2 + 5x + 6 = 0$, $\frac{1}{2}$, $\sqrt{16}$)
 * - $$...$$ (display equation block)
 * - \(...\) (inline math)
 * - \[...\] (display block)
 * - Automatic detection of LaTeX commands (\frac, \sqrt, \times, \pm, x^2, etc.)
 */
export const MathText: React.FC<MathTextProps> = ({
  text,
  className = '',
  displayMode = false,
}) => {
  const renderedElements = useMemo(() => {
    if (!text || typeof text !== 'string') {
      return null;
    }

    // Replace common escaped unicode / formatting quirks
    let processed = text
      .replace(/&times;/g, '×')
      .replace(/&divide;/g, '÷')
      .replace(/&plusmn;/g, '±')
      .replace(/&radic;/g, '√')
      .replace(/&le;/g, '≤')
      .replace(/&ge;/g, '≥')
      .replace(/&ne;/g, '≠')
      .replace(/&pi;/g, 'π');

    // Tokenize text into Math segments and Regular Text segments
    // Matches:
    // 1. $$ ... $$ (display math)
    // 2. \[ ... \] (display math)
    // 3. $ ... $   (inline math)
    // 4. \( ... \) (inline math)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^\$\n])+\$|\\\([\s\S]*?\\\))/g;
    
    // Check if entire text looks like a bare LaTeX formula without $ (e.g. \frac{a}{b}, \sqrt{25}, x^2 + y^2 = r^2)
    const isBareFormula = 
      !regex.test(processed) && 
      /^(?:\\frac|\\sqrt|\\pm|\\times|\d+\^\d+|[a-zA-Z]\^[0-9a-zA-Z]+|[a-zA-Z]_[0-9a-zA-Z]+|\\[a-zA-Z]+)/.test(processed.trim());

    if (isBareFormula) {
      try {
        const html = katex.renderToString(processed.trim(), {
          throwOnError: false,
          displayMode: displayMode || false,
        });
        return <span className={`inline-katex-formula ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        // Fallback to text
        return <span className={className}>{processed}</span>;
      }
    }

    // Reset regex index after testing
    regex.lastIndex = 0;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(processed)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        const textBefore = processed.substring(lastIndex, match.index);
        parts.push(
          <span key={`txt-${lastIndex}`}>{textBefore}</span>
        );
      }

      const matchStr = match[0];
      let isDisplay = displayMode;
      let mathContent = '';

      if (matchStr.startsWith('$$') && matchStr.endsWith('$$')) {
        isDisplay = true;
        mathContent = matchStr.slice(2, -2).trim();
      } else if (matchStr.startsWith('\\[') && matchStr.endsWith('\\]')) {
        isDisplay = true;
        mathContent = matchStr.slice(2, -2).trim();
      } else if (matchStr.startsWith('\\(') && matchStr.endsWith('\\)')) {
        isDisplay = false;
        mathContent = matchStr.slice(2, -2).trim();
      } else if (matchStr.startsWith('$') && matchStr.endsWith('$')) {
        isDisplay = false;
        mathContent = matchStr.slice(1, -1).trim();
      } else {
        mathContent = matchStr;
      }

      try {
        const html = katex.renderToString(mathContent, {
          throwOnError: false,
          displayMode: isDisplay,
        });

        if (isDisplay) {
          parts.push(
            <div
              key={`math-${match.index}`}
              className="my-2 overflow-x-auto py-1 px-2 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else {
          parts.push(
            <span
              key={`math-${match.index}`}
              className="inline-block align-middle mx-0.5 px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
      } catch {
        parts.push(<span key={`err-${match.index}`}>{matchStr}</span>);
      }

      lastIndex = match.index + matchStr.length;
    }

    // Remaining text after last match
    if (lastIndex < processed.length) {
      parts.push(
        <span key={`txt-${lastIndex}`}>
          {processed.substring(lastIndex)}
        </span>
      );
    }

    return <span className={className}>{parts}</span>;
  }, [text, className, displayMode]);

  return <>{renderedElements}</>;
};
