# Bulk Question Upload Feature

## Overview
The admin dashboard now supports bulk uploading questions via JSON files. This allows you to add multiple questions at once instead of manually entering them one by one.

## How to Use

### Step 1: Prepare Your JSON File
Create a JSON file with an array of question objects. Each question must have the following fields:

**Required Fields:**
- `stage` (number): 1 or 2
  - Stage 1 questions: Used for Stage 1 rounds
  - Stage 2 questions: Used for Stage 2 rounds (can also use Stage 1 if Stage 2 runs out)
- `domain` (string): One of the 10 supported domains
- `question` (string): The question text
- `correctAnswer` (string): The correct answer

**Optional Fields:**
- `imageUrl` (string): URL to an image for the question (can be empty string or null)

### Step 2: Supported Domains
- Algorithms
- Astronomy
- Biology
- Crypto
- Economics
- Finance
- Game Theory
- Indian History
- Machine Learning
- Probability
- Statistics

### Step 3: JSON Format Example

```json
[
  {
    "stage": 1,
    "domain": "Algorithms",
    "question": "What is the time complexity of binary search?",
    "correctAnswer": "O(log n)",
    "imageUrl": ""
  },
  {
    "stage": 2,
    "domain": "Finance",
    "question": "What does NPV stand for?",
    "correctAnswer": "Net Present Value",
    "imageUrl": "https://example.com/npv-diagram.png"
  }
]
```

### Step 4: Upload via Admin Dashboard

1. Log in to the admin dashboard
2. Navigate to the **Questions** tab
3. Find the **"Bulk Upload Questions (JSON)"** section
4. Click the file input to select your JSON file
5. Click the **Upload** button
6. The system will validate and upload all questions
7. You'll see a success message showing how many questions were uploaded

### Step 5: Validation

The system will validate:
- JSON syntax is correct
- All required fields are present
- Stage is 1 or 2
- Domain is one of the supported domains
- Question and answer are not empty

If validation fails, you'll see an error message with details about what went wrong.


## Example

A sample JSON file (`sample-questions.json`) is included in the repository root with example questions for all 11 domains.


## API Endpoint

**POST** `/api/admin/questions/bulk-upload`

**Authentication:** Admin only

**Request Body:** Array of question objects

**Response:**
```json
{
  "success": true,
  "message": "Successfully uploaded 12 questions",
  "count": 12,
  "totalProvided": 12
}
```

## Error Handling

Common errors and solutions:

1. **"Invalid JSON file"**
   - Check that your JSON syntax is valid
   - Use a JSON validator like jsonlint.com

2. **"Invalid question format"**
   - Ensure all required fields are present
   - Check that stage is 1 or 2
   - Verify domain names match exactly (case-sensitive)

3. **"No questions provided"**
   - Make sure your JSON array is not empty

4. **"Unauthorized"**
   - You must be logged in as an admin

## Tips

- Start with the sample file and modify it
- You can upload questions multiple times
- Duplicate questions will be skipped automatically
- Questions can include images by providing a valid URL
- Make sure image URLs are publicly accessible

## Question Selection Logic

When starting a round:

1. **Stage 1**: Uses unused Stage 1 questions only
2. **Stage 2**: 
   - First tries to use unused Stage 2 questions
   - If no Stage 2 questions available, falls back to unused Stage 1 questions
   - This allows you to reuse Stage 1 questions for Stage 2 rounds

This means you can:
- Upload a large set of Stage 1 questions and they'll be available for both stages
- Upload specific Stage 2 questions that will be prioritized for Stage 2
- Not worry about running out of questions in Stage 2
