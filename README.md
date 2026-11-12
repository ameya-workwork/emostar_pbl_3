# EmoStar: An Insightful Journalling App

EmoStar is an insightful emotion-analysis journaling web application rebuilt in React, TypeScript, and Tailwind CSS. It empowers users to reflect on their daily experiences and instantly generates a multi-dimensional emotional breakdown with primary emotions, secondary nuances, and percentage distribution.

## Features

- **Home Dashboard**: Quick reflection overview, dominant emotional state, safe local browser persistence, and one-tap navigation.
- **Journal Entry (`/journal`)**: Reflect freely with an expansive text editor, dynamic word count, writing prompts, and automatic emotion classification upon saving.
- **Emotion Analysis Engine**: Cognitive emotion classification mapping nuanced emotions into 8 core categories:
  - Joy
  - Calm
  - Sadness
  - Anxiety
  - Anger
  - Confusion
  - Motivation
  - Stress
- **Emotional Breakdown (`/analysis`)**: Displays the primary emotion, detected secondary emotions, and an interactive distribution breakdown totaling 100%.
- **Historical Data (`/history`)**: Browse previous reflections formatted with timestamps, search across written journals, filter by emotion, and revisit past analyses.
- **Mindful Controls**: Ambient audio frequency toggle and breathing/heart pulse check-in dialog.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```
