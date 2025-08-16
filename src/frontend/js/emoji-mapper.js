/**
 * Emoji Mapper for Word Builder Game
 * 
 * Maps words to appropriate emojis for visual representation
 * Eliminates the need for image files and improves loading performance
 */
class EmojiMapper {
    constructor() {
        this.emojiMap = this.initializeEmojiMap();
    }

    /**
     * Initialize the emoji mapping for common words
     */
    initializeEmojiMap() {
        return {
            // Animals
            'cat': '🐱',
            'dog': '🐶',
            'fish': '🐟',
            'frog': '🐸',
            'duck': '🦆',
            'bat': '🦇',
            'rat': '🐭',
            'pig': '🐷',
            'cow': '🐄',
            'bee': '🐝',
            'bird': '🐦',
            'bear': '🐻',
            'lion': '🦁',
            'fox': '🦊',
            'owl': '🦉',
            'sheep': '🐑',
            'horse': '🐴',
            'rabbit': '🐰',
            'chicken': '🐔',
            'elephant': '🐘',
            'mouse': '🐭',

            // Objects
            'pen': '🖊️',
            'cup': '☕',
            'hat': '👒',
            'bed': '🛏️',
            'box': '📦',
            'book': '📚',
            'chair': '🪑',
            'table': '🍽️',   // Place setting represents a dining table
            'house': '🏠',
            'car': '🚗',
            'bus': '🚌',
            'bike': '🚲',
            'ball': '⚽',
            'key': '🔑',
            'bag': '👜',
            'shoe': '👟',
            'clock': '🕐',
            'phone': '📱',
            'lamp': '💡',
            'door': '🚪',
            'window': '🪟',

            // Food
            'apple': '🍎',
            'bread': '🍞',
            'milk': '🥛',
            'cake': '🎂',
            'egg': '🥚',
            'fish': '🐟',
            'meat': '🥩',
            'rice': '🍚',
            'soup': '🍲',
            'pizza': '🍕',
            'banana': '🍌',
            'orange': '🍊',
            'grape': '🍇',
            'lemon': '🍋',
            'cherry': '🍒',
            'cookie': '🍪',
            'candy': '🍬',
            'honey': '🍯',
            'cheese': '🧀',
            'butter': '🧈',

            // Nature
            'sun': '☀️',
            'tree': '🌳',
            'star': '⭐',
            'moon': '🌙',
            'water': '💧',
            'fire': '🔥',
            'snow': '❄️',
            'rain': '🌧️',
            'wind': '💨',
            'cloud': '☁️',
            'flower': '🌸',
            'grass': '🌱',
            'leaf': '🍃',
            'rock': '🪨',
            'sand': '🏖️',
            'sea': '🌊',
            'mountain': '⛰️',
            'forest': '🌲',
            'garden': '🌻',
            'beach': '🏖️',

            // Body parts
            'hand': '✋',
            'foot': '🦶',
            'eye': '👁️',
            'ear': '👂',
            'nose': '👃',
            'mouth': '👄',
            'head': '🗣️',
            'hair': '💇',
            'face': '😊',
            'arm': '💪',
            'leg': '🦵',
            'finger': '👆',
            'tooth': '🦷',
            'heart': '❤️',
            'brain': '🧠',

            // Actions (represented with action emojis)
            'jump': '🤸',
            'run': '🏃',
            'walk': '🚶',
            'sleep': '😴',
            'eat': '🍽️',
            'drink': '🥤',
            'read': '📖',
            'write': '✍️',
            'play': '🎮',
            'sing': '🎤',
            'dance': '💃',
            'swim': '🏊',
            'fly': '✈️',
            'drive': '🚗',
            'cook': '👨‍🍳',
            'clean': '🧹',
            'wash': '🧼',
            'help': '🤝',
            'smile': '😊',
            'laugh': '😂',

            // Colors (using colored objects/symbols)
            'red': '🔴',
            'blue': '🔵',
            'green': '🟢',
            'yellow': '🟡',
            'orange': '🟠',
            'purple': '🟣',
            'pink': '🩷',
            'brown': '🤎',
            'black': '⚫',
            'white': '⚪',
            'gray': '⚫', // Using dark circle for gray
            'grey': '⚫',

            // Size/Descriptive words
            'big': '🟦',    // Large blue square to represent "big"
            'small': '🔹',  // Small blue diamond to represent "small"

            // Emotions
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'scared': '😨',
            'excited': '🤩',
            'tired': '😴',
            'surprised': '😲',
            'worried': '😟',
            'calm': '😌',
            'proud': '😤',

            // Transport
            'train': '🚂',
            'plane': '✈️',
            'boat': '⛵',
            'truck': '🚚',
            'taxi': '🚕',
            'ship': '🚢',
            'rocket': '🚀',

            // Weather
            'sunny': '☀️',
            'cloudy': '☁️',
            'rainy': '🌧️',
            'snowy': '❄️',
            'windy': '💨',
            'stormy': '⛈️',
            'foggy': '🌫️',

            // School/Learning
            'school': '🏫',
            'teacher': '👨‍🏫',
            'student': '👨‍🎓',
            'pencil': '✏️',
            'paper': '📄',
            'desk': '🪑',
            'board': '📋',
            'lesson': '📚',
            'test': '📝',
            'grade': '📊',

            // Default fallback emoji for unknown words
            'default': '❓'
        };
    }

    /**
     * Get emoji for a given word
     * @param {string} word - The word to get emoji for
     * @returns {string} - The corresponding emoji or default
     */
    getEmoji(word) {
        const normalizedWord = word.toLowerCase().trim();
        return this.emojiMap[normalizedWord] || this.emojiMap['default'];
    }

    /**
     * Check if an emoji exists for a word
     * @param {string} word - The word to check
     * @returns {boolean} - True if emoji exists
     */
    hasEmoji(word) {
        const normalizedWord = word.toLowerCase().trim();
        return normalizedWord in this.emojiMap;
    }

    /**
     * Add or update emoji mapping
     * @param {string} word - The word
     * @param {string} emoji - The emoji to map to
     */
    setEmoji(word, emoji) {
        const normalizedWord = word.toLowerCase().trim();
        this.emojiMap[normalizedWord] = emoji;
    }

    /**
     * Get all available words with emojis
     * @returns {Object} - The complete emoji map
     */
    getAllMappings() {
        return { ...this.emojiMap };
    }

    /**
     * Get random emoji for testing
     * @returns {string} - A random emoji from the map
     */
    getRandomEmoji() {
        const words = Object.keys(this.emojiMap);
        const randomWord = words[Math.floor(Math.random() * words.length)];
        return this.emojiMap[randomWord];
    }
}

// Initialize global emoji mapper
window.EmojiMapper = new EmojiMapper();