#!/usr/bin/env node

/**
 * Word Data Validation Script (Node.js version)
 * Validates the JSON structure for word data files
 * Ensures compliance with EAL learning requirements
 */

const fs = require('fs');
const path = require('path');

function validateWordData() {
    const errors = [];
    const levels = [1, 2, 3];
    
    // Validate index file
    const indexPath = path.join(__dirname, 'index.json');
    if (!fs.existsSync(indexPath)) {
        errors.push("Missing index.json file");
        return errors;
    }
    
    try {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
        errors.push("Invalid JSON in index.json: " + e.message);
        return errors;
    }
    
    // Validate each level file
    for (const level of levels) {
        const filePath = path.join(__dirname, `level_${level}.json`);
        
        if (!fs.existsSync(filePath)) {
            errors.push(`Missing level_${level}.json file`);
            continue;
        }
        
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            errors.push(`Invalid JSON in level_${level}.json: ${e.message}`);
            continue;
        }
        
        // Validate required fields
        const requiredFields = ['level', 'name', 'description', 'words'];
        for (const field of requiredFields) {
            if (!data.hasOwnProperty(field)) {
                errors.push(`Missing required field '${field}' in level_${level}.json`);
            }
        }
        
        // Validate words array
        if (data.words && Array.isArray(data.words)) {
            data.words.forEach((word, index) => {
                const wordErrors = validateWord(word, level, index);
                errors.push(...wordErrors);
            });
        }
        
        // Validate categories are present
        const categories = [...new Set(data.words.map(w => w.category))];
        const expectedCategories = ['animals', 'objects', 'actions'];
        for (const category of expectedCategories) {
            if (!categories.includes(category)) {
                errors.push(`Level ${level} missing words from category: ${category}`);
            }
        }
    }
    
    return errors;
}

function validateWord(word, level, index) {
    const errors = [];
    const requiredFields = ['word', 'image', 'phonetic', 'difficulty', 'category', 'letters', 'hints'];
    
    for (const field of requiredFields) {
        if (!word.hasOwnProperty(field)) {
            errors.push(`Level ${level}, word ${index}: Missing required field '${field}'`);
        }
    }
    
    // Validate word structure
    if (word.word && word.letters) {
        const expectedLetters = word.word.toLowerCase().split('');
        if (JSON.stringify(word.letters) !== JSON.stringify(expectedLetters)) {
            errors.push(`Level ${level}, word ${index}: Letters array doesn't match word '${word.word}'`);
        }
    }
    
    // Validate difficulty matches level
    if (word.difficulty && word.difficulty != level) {
        errors.push(`Level ${level}, word ${index}: Difficulty mismatch - expected ${level}, got ${word.difficulty}`);
    }
    
    // Validate category
    const validCategories = ['animals', 'objects', 'actions'];
    if (word.category && !validCategories.includes(word.category)) {
        errors.push(`Level ${level}, word ${index}: Invalid category '${word.category}'`);
    }
    
    // Validate phonetic notation format (basic check for IPA brackets)
    if (word.phonetic && !/^\/.*\/$/.test(word.phonetic)) {
        errors.push(`Level ${level}, word ${index}: Phonetic notation should be in IPA format with forward slashes`);
    }
    
    return errors;
}

// Run validation
const errors = validateWordData();

if (errors.length === 0) {
    console.log("✅ All word data files are valid!");
    console.log("📊 Validation Summary:");
    
    // Show statistics
    for (let level = 1; level <= 3; level++) {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, `level_${level}.json`), 'utf8'));
        const wordCount = data.words.length;
        const categories = data.words.reduce((acc, word) => {
            acc[word.category] = (acc[word.category] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`   Level ${level}: ${wordCount} words (Animals: ${categories.animals || 0}, Objects: ${categories.objects || 0}, Actions: ${categories.actions || 0})`);
    }
} else {
    console.log("❌ Validation errors found:");
    errors.forEach(error => {
        console.log(`   - ${error}`);
    });
    process.exit(1);
}