# Word Data Structure

This directory contains the word data for the Word Builder Game, organized by difficulty levels to support progressive EAL (English as an Additional Language) learning.

## File Structure

```
data/words/
├── index.json          # Master index with level information
├── level_1.json        # Simple CVC words (3 letters)
├── level_2.json        # CVCC/CCVC words (4 letters)
├── level_3.json        # Complex words and blends (5 letters)
├── validate.js         # Node.js validation script
├── validate.php        # PHP validation script
└── README.md          # This documentation
```

## JSON Structure

### Level Files (level_X.json)

Each level file contains:

```json
{
  "level": 1,
  "name": "Simple CVC Words",
  "description": "Basic consonant-vowel-consonant words for beginning EAL learners",
  "words": [
    {
      "word": "cat",
      "image": "images/words/cat.jpg",
      "phonetic": "/kæt/",
      "difficulty": 1,
      "category": "animals",
      "letters": ["c", "a", "t"],
      "hints": "A furry pet that says meow"
    }
  ]
}
```

### Word Object Properties

- **word**: The target word to be built (string)
- **image**: Path to the visual cue image (string)
- **phonetic**: IPA phonetic transcription for pronunciation (string)
- **difficulty**: Numeric difficulty level matching the file level (number)
- **category**: Word category - "animals", "objects", or "actions" (string)
- **letters**: Array of individual letters that make up the word (array)
- **hints**: Helpful description or clue for the word (string)

## Learning Progression

### Level 1: Simple CVC Words (3 letters)
- **Target**: Beginning EAL learners
- **Pattern**: Consonant-Vowel-Consonant
- **Examples**: cat, dog, pen, cup, sun
- **Focus**: Basic letter-sound relationships

### Level 2: CVCC and CCVC Words (4 letters)
- **Target**: Intermediate learners
- **Pattern**: Consonant clusters and blends
- **Examples**: frog, fish, bird, book, milk
- **Focus**: Consonant blends and clusters

### Level 3: Complex Words and Blends (5 letters)
- **Target**: Advanced beginners
- **Pattern**: Complex consonant blends and longer words
- **Examples**: horse, mouse, snake, house, chair
- **Focus**: Complex blends and longer vocabulary

## Categories

### Animals
Living creatures, pets, and wildlife that students can easily visualize and relate to.

### Objects
Everyday items, tools, and things that students encounter in their daily lives.

### Actions
Verbs and activities that students can perform or observe, helping with active vocabulary.

## EAL Pedagogy Principles

The word selection and structure follows established EAL learning principles:

1. **Progressive Difficulty**: Words increase in complexity across levels
2. **Visual Support**: Each word has an associated image for visual learners
3. **Phonetic Support**: IPA transcriptions enable accurate pronunciation
4. **Contextual Learning**: Categories help group related vocabulary
5. **Meaningful Content**: Words are relevant to students' daily experiences

## Usage in Code

### Loading Word Data

```php
// PHP example (WordManager class)
$wordData = json_decode(file_get_contents("data/words/level_1.json"), true);
$words = $wordData['words'];
```

```javascript
// JavaScript example
fetch('data/words/level_1.json')
  .then(response => response.json())
  .then(data => {
    const words = data.words;
    // Use words in game logic
  });
```

### Accessing Word Properties

```javascript
const word = words[0];
console.log(word.word);      // "cat"
console.log(word.letters);   // ["c", "a", "t"]
console.log(word.phonetic);  // "/kæt/"
console.log(word.category);  // "animals"
```

## Validation

Run the validation script to ensure data integrity:

```bash
# Using Node.js
node data/words/validate.js

# Using PHP (if available)
php data/words/validate.php
```

The validation checks:
- JSON syntax validity
- Required field presence
- Letter array matches word spelling
- Difficulty levels match file levels
- Category values are valid
- Phonetic notation format
- Category distribution across levels

## Image Requirements

Images should be:
- Clear and simple illustrations
- Appropriate for young learners
- Culturally neutral when possible
- High contrast for accessibility
- Optimized for web delivery (JPEG/PNG)
- Stored in `images/words/` directory

## Future Enhancements

Potential expansions to the word data structure:

- Audio file paths for native pronunciation
- Difficulty scoring algorithms
- Word frequency data
- Cultural adaptation markers
- Accessibility metadata
- Multi-language support fields