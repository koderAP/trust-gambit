import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Converts text with mathematical notation to HTML
 * Handles:
 * - Superscripts: x^2 → x²
 * - Square roots: \sqrt{x} → √x
 * - Fractions: \frac{a}{b} → a/b (formatted)
 * - LaTeX display math: \[ ... \] and \( ... \)
 */
export function formatSuperscript(text: string): string {
  let result = text;
  
  // Handle display math \[ ... \]
  result = result.replace(/\\\[(.*?)\\\]/gs, (match, content) => {
    return `<div class="math-display">${formatMathContent(content)}</div>`;
  });
  
  // Handle inline math \( ... \)
  result = result.replace(/\\\((.*?)\\\)/g, (match, content) => {
    return `<span class="math-inline">${formatMathContent(content)}</span>`;
  });
  
  // Handle standalone mathematical expressions
  result = formatMathContent(result);
  
  return result;
}

/**
 * Format mathematical content (helper function)
 */
function formatMathContent(text: string): string {
  let result = text;
  
  // Handle \sqrt{...}
  result = result.replace(/\\sqrt\{([^}]+)\}/g, (match, content) => {
    return `√<span style="text-decoration: overline;">${formatMathContent(content)}</span>`;
  });
  
  // Handle \frac{a}{b}
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, numerator, denominator) => {
    return `<sup>${formatMathContent(numerator)}</sup>/<sub>${formatMathContent(denominator)}</sub>`;
  });
  
  // Handle \lfloor and \rfloor
  result = result.replace(/\\lfloor/g, '⌊');
  result = result.replace(/\\rfloor/g, '⌋');
  
  // Handle \lim
  result = result.replace(/\\lim/g, 'lim');
  
  // Handle subscripts with underscore
  result = result.replace(/_\{([^}]+)\}/g, (match, content) => {
    return `<sub>${content}</sub>`;
  });
  result = result.replace(/_(\w)/g, (match, char) => {
    return `<sub>${char}</sub>`;
  });
  
  // Handle \to (arrow)
  result = result.replace(/\\to/g, '→');
  
  // Handle \infty
  result = result.replace(/\\infty/g, '∞');
  
  // Handle superscripts with ^{...} or ^x
  result = result.replace(/\^(\{[^}]+\}|\w+)/g, (match, superscript) => {
    const cleanSuper = superscript.startsWith('{') ? superscript.slice(1, -1) : superscript;
    return `<sup>${cleanSuper}</sup>`;
  });
  
  return result;
}
