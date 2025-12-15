# AI Feedback Customization Guide for FieldTalk

This guide explains how to customize and adjust the AI feedback system for your EFL app.

## Overview

The AI feedback system uses OpenAI's GPT models to provide feedback to students in three main areas:
1. **Writing exercises** - Written text analysis
2. **Speech practice** - Pronunciation and speaking assessment
3. **Conversation practice** - Real-time dialogue with an AI coach

## Main Configuration Files

### 1. Writing & Conversation Feedback
**File**: `src/app/api/ai-feedback/route.js`

This file controls feedback for writing and conversation exercises.

#### Key Areas to Customize:

##### A. Overall Tone and Encouragement Level
Look for the `context` field in each language section (lines 40-48 for Portuguese):

```javascript
context: `Você é um tutor de inglês MUITO ENCORAJADOR...`
```

**What you can adjust:**
- Level of encouragement (MUITO ENCORAJADOR = "VERY ENCOURAGING")
- Student level (INICIANTES = "BEGINNERS")
- Teaching philosophy statements

**Example modification** - To make it even more encouraging:
```javascript
context: `Você é um tutor de inglês EXTREMAMENTE POSITIVO E ENCORAJADOR...
  Celebre cada pequena vitória! Seja entusiástico!`
```

##### B. Scoring Guidelines
Look for the `writingPrompt` field, specifically the scoring rules (lines 61-65):

```javascript
REGRAS DE PONTUAÇÃO:
- Se o aluno tentou e escreveu algo relevante: mínimo 7/10
- Se o aluno escreveu algo compreensível e relacionado ao tópico: 8/10
- Se o aluno escreveu bem com apenas pequenos erros: 9/10
```

**What you can adjust:**
- Minimum scores for different quality levels
- How strict the grading should be
- Score ranges (currently 7-9 for beginners, with 10 reserved for perfection)

**Example modification** - To be even more lenient:
```javascript
REGRAS DE PONTUAÇÃO:
- Se o aluno tentou: mínimo 8/10
- Se o aluno escreveu algo compreensível: 9/10
- Qualquer resposta boa: 9-10/10
```

##### C. Number of Corrections
Look for instructions like (line 52):

```javascript
1. APENAS correções gramaticais IMPORTANTES (ignore erros menores) - máximo 2-3 correções
```

**What you can adjust:**
- Maximum number of corrections to show (currently 2-3)
- What types of errors to highlight vs. ignore
- How detailed explanations should be

**Example modification** - To show fewer corrections:
```javascript
1. APENAS 1-2 correções gramaticais MUITO IMPORTANTES (ignore todos os erros menores)
```

##### D. Conversation Feedback Strictness
Look for `conversationContext` (lines 78-84):

```javascript
Corrija APENAS erros importantes muito gentilmente
Ignore erros menores - foque em encorajar a comunicação!
```

**What you can adjust:**
- Which errors to correct in conversations
- How to phrase corrections (gentle vs. direct)
- Whether to interrupt for errors or let them flow

### 2. Speech/Pronunciation Feedback
**File**: `src/app/api/ai-speech/route.js`

This file controls feedback for pronunciation exercises.

#### Key Areas to Customize:

##### A. System Prompt (lines 88-89)
```javascript
content: "You are a VERY ENCOURAGING expert English pronunciation coach helping BEGINNER Brazilian football players..."
```

**What you can adjust:**
- Encouragement level
- Student level specification
- Accent acceptance policies

##### B. Scoring Ranges (lines 171-173)
```javascript
- pronunciation_score: 75-85 for basic attempts, 85-90 for good attempts, 90-95 for excellent attempts
- accuracy_score: Did they say the right words? Be lenient - accept synonyms and accent variations
```

**What you can adjust:**
- Score ranges for different quality levels
- How strictly to judge accuracy vs. pronunciation
- Minimum acceptable scores

**Example modification** - To be more lenient:
```javascript
- pronunciation_score: 80-90 for basic attempts, 90-95 for good attempts, 95-100 for excellent attempts
```

##### C. Accent Variation Handling (lines 165-167)
```javascript
- ACCEPT ALL ACCENT VARIATIONS as correct (British, American, Australian, Irish, Scottish, South African, etc.)
- DO NOT penalize for accent differences - only correct if the word is completely wrong or unintelligible
```

**What you can adjust:**
- Which accents to accept
- How strict to be about intelligibility
- Whether to prefer one accent over others (currently: all equal)

**Example modification** - To focus on British English but still accept others:
```javascript
- PREFER British English pronunciation, but ACCEPT American, Australian, etc. as fully correct
- DO NOT penalize for any recognizable accent variation
```

##### D. Feedback Structure (lines 180-184)
```javascript
"strengths": ["At least 2-3 positive specific things they did well"],
"improvements": ["Only 1-2 gentle, simple suggestions if really needed"],
```

**What you can adjust:**
- Number of strengths to highlight (currently 2-3)
- Number of improvement suggestions (currently 1-2)
- Whether improvements are required or optional

## Common Customization Scenarios

### Scenario 1: Students are still finding it too harsh
**Solution**: Lower minimum scores and reduce correction count

In `route.js` (writing feedback):
```javascript
// Change from:
mínimo 7/10
máximo 2-3 correções

// To:
mínimo 8/10
máximo 1-2 correções (apenas erros muito importantes)
```

### Scenario 2: You want to focus on specific pronunciation issues
**Solution**: Add specific guidance to the speech prompt

In `ai-speech/route.js`:
```javascript
// Add to the prompt:
Pay special attention to:
- TH sounds (common challenge for Portuguese speakers)
- Final consonants (often dropped in Portuguese)
BUT: Only mention if it significantly affects understanding
```

### Scenario 3: You want different feedback for advanced vs. beginner students
**Solution**: Check student level and use different prompts

You could modify the code to check a student's level from the database:
```javascript
// In route.js, after getting playerData:
const studentLevel = playerData.proficiency_level || 'beginner';

// Then use different prompts:
const strictness = studentLevel === 'beginner' ? 'VERY LENIENT' : 'MODERATE';
```

### Scenario 4: Different feedback for different languages
The system already supports Portuguese (pt-BR), Spanish (es), French (fr), and English (en).

To adjust Portuguese but not English, just modify the `pt-BR` section independently.

## Testing Your Changes

After making changes:

1. **Restart your development server** to pick up the changes
2. **Test with sample submissions**:
   - Submit a basic attempt (should get ~7-8/10)
   - Submit a good attempt (should get ~8-9/10)
   - Submit a poor attempt (should still get encouraging feedback)
3. **Check the feedback**:
   - Is the score appropriate?
   - Are there too many/few corrections?
   - Is the tone encouraging enough?

## Important Notes

### The Balance of Feedback
You want to find the sweet spot between:
- ✅ Encouraging students to keep trying
- ✅ Giving them useful feedback to improve
- ❌ Being so lenient it's meaningless
- ❌ Being so harsh they get discouraged

### Current Philosophy
The current setup is calibrated for **beginners** who need:
- High scores (7-9/10) to stay motivated
- Few corrections (1-3) to avoid overwhelm
- Lots of positive reinforcement
- Acceptance of all accent variations

### When to Be More Strict
As students progress, you might want to:
- Lower the minimum score (e.g., 5-9 range instead of 7-9)
- Show more corrections (e.g., 3-5 instead of 1-3)
- Be more specific about pronunciation preferences
- Expect higher quality for top scores

## Temperature Settings

Both APIs use a `temperature` parameter that affects AI randomness:

**Writing feedback** (line 273): `temperature: 0.3`
- Lower = more consistent, predictable feedback
- Higher = more varied, creative feedback

**Conversation** (line 387): `temperature: 0.8`
- Higher because we want natural, varied conversation

**Speech analysis** (line 96): `temperature: 0.7`
- Moderate for balanced feedback

You can adjust these (0.0 to 1.0):
- **0.0-0.3**: Very consistent, formal
- **0.4-0.7**: Balanced
- **0.8-1.0**: Creative, varied

## Need Help?

If you're making changes and want to verify they're working:

1. Check the browser console for the "AI FEEDBACK DEBUG" logs
2. Look at the OpenAI API responses in the server logs
3. Test with the same input multiple times to see consistency
4. Start with small changes and test before making big modifications

## File Locations Quick Reference

- **Writing/Conversation feedback prompts**: `src/app/api/ai-feedback/route.js`
- **Speech/pronunciation prompts**: `src/app/api/ai-speech/route.js`
- **Writing exercise component**: `src/components/exercises/AIWritingExercise.js`
- **Speech exercise component**: `src/components/exercises/AISpeechPractice.js`
- **Conversation exercise component**: `src/components/exercises/AIConversationPractice.js`

---

**Remember**: The goal is to encourage your students while helping them improve. Start lenient and adjust based on real student feedback!
