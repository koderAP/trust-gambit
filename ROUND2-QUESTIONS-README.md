# Round 2 Questions - Upload Instructions

## Questions Added

This file contains 8 Stage 2 questions covering:
- **Combinatorics** (2 questions)
- **Calculus** (2 questions)
- **Number Theory** (2 questions)
- **Probability** (2 questions)

## How to Upload

### Option 1: Using the Admin Dashboard (Recommended)

1. Log in to the admin dashboard at `/admin/dashboard`
2. Navigate to the **Questions** tab
3. Click on **Bulk Upload Questions**
4. Select the file: `trust-gambit-round2-questions.json`
5. Click **Upload**

### Option 2: Using the API

```bash
# Upload the questions via API
curl -X POST http://your-domain/api/admin/questions/bulk \
  -H "Content-Type: application/json" \
  -d @trust-gambit-round2-questions.json
```

## Mathematical Notation Support

The system now supports rich mathematical notation in questions:

### Supported LaTeX Commands:

| LaTeX | Rendered | Example |
|-------|----------|---------|
| `x^2` or `x^{12}` | x² or x¹² | Superscripts |
| `\sqrt{x}` | √x̅ | Square roots |
| `\frac{a}{b}` | ᵃ⁄ᵇ | Fractions |
| `\lfloor x \rfloor` | ⌊x⌋ | Floor function |
| `\lim` | lim | Limits |
| `a_n` or `a_{n+1}` | aₙ or aₙ₊₁ | Subscripts |
| `\to` | → | Arrow |
| `\infty` | ∞ | Infinity |
| `\( ... \)` | Inline math | Inline expressions |
| `\[ ... \]` | Display math | Block equations |

### Examples from Round 2 Questions:

1. **Superscripts**:
   - Input: `(1 + x^7 + x^{13})^{100}`
   - Renders as: (1 + x⁷ + x¹³)¹⁰⁰

2. **Square Roots**:
   - Input: `\sqrt{1 - \sqrt{1 - a_n^2}}`
   - Renders as: √(1 - √(1 - aₙ²))

3. **Fractions**:
   - Input: `\frac{1}{3}`
   - Renders as: ¹⁄₃

4. **Complex Expressions**:
   - Input: `\lfloor \lim_{n \to \infty} 2^n a_n \rfloor`
   - Renders as: ⌊limₙ→∞ 2ⁿ aₙ⌋

## Question Format

Each question must include:

```json
{
  "stage": 2,                    // Stage 1 or 2
  "domain": "Calculus",          // One of the 11 domains
  "question": "...",             // Question text with LaTeX notation
  "correctAnswer": "3",          // The correct answer
  "imageUrl": ""                 // Optional image URL
}
```

## Verification

After uploading, verify the questions appear correctly:

1. Go to the **Questions** tab in admin dashboard
2. Check that all 8 questions are listed
3. Verify the mathematical notation renders properly
4. Confirm all are marked as "Stage 2"

## Notes

- Questions use LaTeX notation within `\( ... \)` for inline math
- Use `\[ ... \]` for display math (centered equations)
- The system automatically converts LaTeX to HTML for rendering
- All Stage 2 questions are suitable for the final rounds
