import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * Repairs mangled LaTeX strings caused by JSON escaping / control character decoding:
 * - \f -> FormFeed (\x0c) renders as ⇡rac -> repaired to \frac
 * - \t -> Tab (\x09) before ext, imes, heta -> repaired to \text, \times, \theta
 * - \r -> Carriage Return (\x0d) before ightarrow -> repaired to \rightarrow
 * - \b -> Backspace (\x08) before eta -> repaired to \beta
 * - Isolated bare LaTeX fragments without $ delimiters
 */
export function repairMangledLatex(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let text = input;

  // 1. Repair Formfeed (\x0c, \f, ⇡, ↑) before 'rac' or bare 'rac{'
  text = text.replace(/[\x0c\f\u21e1\u2191]\s*rac/gi, '\\frac');
  text = text.replace(/(^|[\s=+\-*\/_^({\[,])rac\{/gi, '$1\\frac{');
  text = text.replace(/⇡rac/gi, '\\frac');
  text = text.replace(/↑rac/gi, '\\frac');

  // 2. Repair Tab (\x09, \t) before 'ext{', 'imes', 'heta', 'riangle', 'an'
  text = text.replace(/[\x09\t]\s*ext\{/gi, '\\text{');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])ext\{/gi, '$1\\text{');
  text = text.replace(/[\x09\t]\s*imes/gi, '\\times');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])imes\b/gi, '$1\\times');
  text = text.replace(/[\x09\t]\s*heta/gi, '\\theta');
  text = text.replace(/[\x09\t]\s*riangle/gi, '\\triangle');
  text = text.replace(/[\x09\t]\s*an\b/gi, '\\tan');

  // 3. Repair Carriage Return (\x0d, \r) before 'ightarrow', 'eftarrow', 'ight', 'eft'
  text = text.replace(/[\x0d\r]\s*ightarrow/gi, '\\rightarrow');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])ightarrow/gi, '$1\\rightarrow');
  text = text.replace(/[\x0d\r]\s*eftarrow/gi, '\\leftarrow');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])eftarrow/gi, '$1\\leftarrow');
  text = text.replace(/[\x0d\r]\s*ight\b/gi, '\\right');

  // 4. Repair Backspace (\x08, \b) before 'eta', 'ar{', 'ox{'
  text = text.replace(/[\x08]\s*eta\b/gi, '\\beta');
  text = text.replace(/[\x08]\s*ar\{/gi, '\\bar{');
  text = text.replace(/[\x08]\s*ox\{/gi, '\\box{');

  // 5. Repair Newline (\x0a, \n) before 'eq'
  text = text.replace(/[\x0a\n]\s*eq\b/gi, ' \\neq ');

  // 6. Repair bare 'sqrt{' missing leading backslash
  text = text.replace(/(^|[\s=+\-*\/_^({\[,])sqrt\{/gi, '$1\\sqrt{');

  // 7. Replace common HTML entities with standard symbols
  text = text
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/&plusmn;/g, '±')
    .replace(/&radic;/g, '√')
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&ne;/g, '≠')
    .replace(/&pi;/g, 'π')
    .replace(/&theta;/g, 'θ')
    .replace(/&alpha;/g, 'α')
    .replace(/&beta;/g, 'β')
    .replace(/&infin;/g, '∞')
    .replace(/&deg;/g, '°');

  return text;
}

/**
 * Auto-wraps bare un-delimited LaTeX expressions (e.g. \frac{a}{b}, \sqrt{x}, \rightarrow) into $...$
 * so the math tokenizer can parse and render them with KaTeX without corrupting surrounding Tamil text.
 */
function prepareDelimitedMath(input: string): string {
  let text = repairMangledLatex(input);

  // If text already has full delimiter pairs, handle them carefully
  // Pattern to find bare LaTeX commands outside existing $...$, $$...$$, \[...\], \(...\)
  // Match tokens: either existing math block OR normal text segment
  const blockRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^\$\n])+\$|\\\([\s\S]*?\\\))/g;
  
  const segments: string[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = blockRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      const nonMath = text.substring(lastIdx, m.index);
      segments.push(wrapBareLatexCommands(nonMath));
    }
    segments.push(m[0]);
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    segments.push(wrapBareLatexCommands(text.substring(lastIdx)));
  }

  return segments.join('');
}

/**
 * Converts bare LaTeX statements in non-math text into $...$
 */
function wrapBareLatexCommands(str: string): string {
  if (!str) return '';

  // Match expressions containing LaTeX commands like:
  // \frac{...}{...}, \sqrt{...}, \text{...}, \rightarrow, \times, \pm, \div, etc.
  // Example: 253 \text{ நாட்கள்} \rightarrow \frac{253}{7} = 36
  // Or: \frac{70}{7} = 10
  // We match continuous math sequences starting with a backslash command or math operator chain
  const bareMathRegex = /(\\(?:frac|dfrac|tfrac|sqrt|text|rightarrow|leftarrow|Rightarrow|Leftarrow|times|div|pm|mp|cdot|approx|neq|le|ge|leq|geq|pi|theta|alpha|beta|degree|circ|angle|triangle)\b(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[0-9a-zA-Z_^\-+*/=<>(),.\s\u0B80-\u0BFF])*)/g;

  return str.replace(bareMathRegex, (fullMatch) => {
    // If the match is just plain whitespace, don't wrap
    if (!fullMatch.trim()) return fullMatch;
    
    // Trim trailing punctuation that belongs to Tamil text (like ., ,, ;, :, Tamil words after space if any)
    let mathPart = fullMatch.trim();
    let trailingPunctuation = '';
    
    // If it ends with sentence period or comma
    if (/[.,;:?!]$/.test(mathPart)) {
      trailingPunctuation = mathPart.slice(-1);
      mathPart = mathPart.slice(0, -1).trim();
    }

    if (!mathPart) return fullMatch;
    return `$${mathPart}$${trailingPunctuation}`;
  });
}

/**
 * Robust Math & LaTeX parser and renderer for Tamil + English + Math equations.
 * Supports:
 * - $...$ (inline math, e.g. $x^2 + 5x + 6 = 0$, $\frac{1}{2}$, $\sqrt{16}$)
 * - $$...$$ (display equation block)
 * - \(...\) (inline math)
 * - \[...\] (display block)
 * - Automatic repair of mangled JSON escape characters (⇡rac -> \frac, etc.)
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

    // 1. Repair mangled LaTeX and prepare delimiters
    const processed = prepareDelimitedMath(text);

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
        parts.push(<span key={`err-${match.index}`}>{mathContent || matchStr}</span>);
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
