# MoodMatch - Personalized Recommendations

A futuristic Next.js app that provides personalized book, meal, and activity recommendations based on how you feel.

## Features

- 🤖 AI-powered recommendation system
- 📚 Personalized book recommendations (3 suggestions)
- 🍽️ Meal suggestions based on your mood (3 suggestions)
- 🎯 Activity recommendations (3 suggestions)
- ✨ Futuristic UI with neon effects and glassmorphism

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Make sure your `.env` file contains:
```
OPENAI_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (GPT-4)

## How It Works

Simply share how you're feeling, and MoodMatch will provide you with:
- 3 book recommendations tailored to your emotional state
- 3 meal suggestions that match your mood
- 3 activities that suit your current feelings

The AI uses GPT-4 to understand your feelings and provide personalized suggestions in a clean, organized format.

