# AI Hint System for Gap-Fill Exercises

## 📋 Overview

The AI Hint System enhances gap-fill exercises by providing contextual, progressive hints without revealing answers. Designed specifically for football-context learning, it helps Brazilian players understand English through familiar sports scenarios.

## 🚀 Key Features

### 🎯 Smart Progressive Hints
- **First Hint**: Word type identification + football context
- **Second Hint**: More specific situational clue
- **Limit**: Maximum 2 hints per gap to encourage thinking
- **Context-Aware**: All hints relate to football situations

### 🎨 Visual Feedback System
- **Yellow State**: First hint used (button + input border)
- **Orange State**: Second hint used (button + input border)  
- **Gray State**: All hints exhausted (disabled button)
- **Usage Counter**: "X/2 hints used" indicator in top-right

### 🏆 Performance Integration
- **XP Calculation**: Base 100 XP with penalties
- **Hint Penalty**: -10 XP per hint used (max -40)
- **Attempt Penalty**: -5 XP per wrong attempt (max -30)
- **Minimum XP**: Always award at least 30 XP

## 🛠️ Technical Implementation

### Core Logic Integration
```javascript
// Hint tracking state
const [hintUsage, setHintUsage] = useState({}); // Count per gap
const [hintHistory, setHintHistory] = useState({}); // All hints per gap
const MAX_HINTS_PER_GAP = 2;

// Progressive hint requests
const getAIHint = async (sentenceId, sentence) => {
  const hintLevel = (hintUsage[sentenceId] || 0) + 1;
  
  let contextPrompt = '';
  if (hintLevel === 1) {
    contextPrompt = `Give helpful first hint about word type and football context...`;
  } else {
    contextPrompt = `Give more specific clue about meaning in football terms...`;
  }
  
  // Use existing /api/ai-feedback endpoint
  const response = await fetch('/api/ai-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'gap_fill',
      content: sentence.text,
      context: contextPrompt,
      lessonId
    })
  });
};
```

### Visual State Management
```javascript
const getHintButtonStyle = (sentenceId) => {
  const usedHints = hintUsage[sentenceId] || 0;
  const isDisabled = usedHints >= MAX_HINTS_PER_GAP;
  
  if (isDisabled) {
    return "bg-gray-200 text-gray-400 cursor-not-allowed";
  } else if (usedHints === 1) {
    return "bg-orange-100 text-orange-700 hover:bg-orange-200";
  } else {
    return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
  }
};
```

### Performance Calculation
```javascript
const calculateXP = () => {
  const totalHints = Object.values(hintUsage).reduce((a, b) => a + b, 0);
  const totalAttempts = Object.values(attempts).reduce((a, b) => a + b, 0);
  const baseXP = 100;
  const attemptPenalty = Math.min(totalAttempts * 5, 30);
  const hintPenalty = Math.min(totalHints * 10, 40);
  return Math.max(baseXP - attemptPenalty - hintPenalty, 30);
};
```

## ⚽ Football Context Examples

### Sample Hint Progression

**Sentence**: "The striker needs to ___ the ball into the net to score a goal."

**First Hint** (Word Type + Context):
> "Think about what action a striker performs with the ball when trying to score. It's a verb that describes the physical contact between player and ball."

**Second Hint** (Specific Context):
> "In football, this is the most common way to propel the ball towards the goal. Strikers practice this action repeatedly in training to improve their accuracy."

**Answer**: kick/shoot/put

### Football Vocabulary Coverage
- **Actions**: kick, shoot, pass, tackle, save, press
- **Positions**: striker, goalkeeper, defender, midfielder
- **Situations**: penalty, corner, free kick, offside
- **Training**: warm up, practice, drill, fitness

## 🔧 Integration with Existing Logic

### Preserved Core Functionality
✅ Original gap-fill logic unchanged  
✅ Answer checking mechanism intact  
✅ XP calculation enhanced (not replaced)  
✅ Switch statement structure maintained  
✅ Existing UI components preserved  

### New Additions
🆕 Hint usage tracking  
🆕 Visual state management  
🆕 AI prompt generation  
🆕 Progressive hint display  
🆕 Performance impact calculation  

## 📱 User Experience Flow

1. **Initial State**: Student sees gap-fill exercise with "Get Hint" button
2. **First Attempt**: Student tries answer, may get it wrong
3. **First Hint**: Clicks "Get Hint" → Yellow state, receives word type + context
4. **Second Hint**: Clicks "Another Hint" → Orange state, receives specific clue
5. **Exhausted**: Button becomes "No More Hints" (gray, disabled)
6. **Completion**: XP awarded based on hint usage and attempts

## 🎯 Demo Page Features

Visit `/demo/gap-fill-hints` to test:

### Football Sentences Included
1. "The striker needs to ___ the ball into the net to score a goal."
2. "Before the match, all players must ___ up properly to avoid injury."
3. "The goalkeeper made an amazing ___ to stop the penalty shot."
4. "The coach told the team to ___ harder during the second half." 
5. "The defender needs to ___ his opponent to prevent a goal."

### Testing Instructions
1. Try typing wrong answers first
2. Use hints progressively  
3. Observe visual state changes
4. Complete exercise to see XP impact
5. Review hint history functionality

## 🌍 Language Support

### Hint Language Adaptation
- Hints provided in user's preferred language (Portuguese for Brazilians)
- Football terminology remains in English for learning
- Encouraging tone adapted to Brazilian culture
- Fallback hints for offline functionality

### Example Portuguese Hint
**Portuguese**: "Pense na ação que um atacante faz com a bola para marcar gol. É um verbo que descreve o contato físico entre jogador e bola."

**English**: "Think about the action a striker does with the ball to score a goal. It's a verb that describes physical contact between player and ball."

## 📊 Performance Metrics

### XP Scoring System
| Scenario | Base XP | Penalties | Final XP |
|----------|---------|-----------|----------|
| Perfect (no hints, first try) | 100 | 0 | 100 |
| 1 hint, 2 attempts | 100 | -15 | 85 |
| 2 hints, 3 attempts | 100 | -35 | 65 |
| Maximum penalties | 100 | -70 | 30 |

### Success Messages
- **No hints**: "Amazing! You completed everything without using any hints! 🏆"
- **Few hints**: "Great work! You used hints wisely and learned effectively! ⭐"  
- **Many hints**: "Good job completing the exercise! Keep practicing to build confidence! 💪"

## 🔍 Testing & Quality Assurance

### Automated Tests
Run `test-hint-system.js` in browser console to verify:
- Hint button presence and functionality
- Visual state transitions
- AI integration readiness
- Performance tracking accuracy

### Manual Testing Checklist
- [ ] Hint limits enforced (max 2 per gap)
- [ ] Visual states change correctly
- [ ] XP calculation includes hint penalties
- [ ] Football context maintained in hints
- [ ] Fallback hints work without AI
- [ ] Completion messages adjust to performance
- [ ] Hint history expandable when multiple hints used

## 🚀 Future Enhancements

### Potential Improvements
1. **Adaptive Difficulty**: Reduce available hints for proficient students
2. **Hint Quality Rating**: Students rate hint helpfulness
3. **Custom Hint Templates**: Coach-specific hint styles
4. **Multilingual Hints**: Support for Spanish, French players
5. **Voice Hints**: Audio pronunciation for vocabulary gaps

### Analytics Integration
- Track hint effectiveness by sentence type
- Identify gaps requiring better hints
- Monitor student dependency on hints
- Optimize hint progression algorithms

The AI Hint System transforms gap-fill exercises from frustrating guesswork into guided learning experiences, perfectly aligned with football contexts that Brazilian players understand and enjoy.