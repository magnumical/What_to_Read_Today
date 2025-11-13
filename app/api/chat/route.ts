import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Recommendation {
  title: string;
  reason: string;
}

interface Recommendations {
  books: Recommendation[];
  meals: Recommendation[];
  activities: Recommendation[];
}

export async function POST(req: NextRequest) {
  try {
    const { feeling } = await req.json();

    const systemPrompt = `You are a compassionate AI wellness companion. Based on the user's feelings, provide personalized recommendations.

CRITICAL: You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text. Start directly with the opening brace { and end with the closing brace }.

The JSON must follow this exact structure:
{
  "books": [
    { "title": "Book Title", "reason": "Why this book matches their feelings" },
    { "title": "Book Title", "reason": "Why this book matches their feelings" },
    { "title": "Book Title", "reason": "Why this book matches their feelings" }
  ],
  "meals": [
    { "title": "Meal Name", "reason": "Why this meal matches their feelings" },
    { "title": "Meal Name", "reason": "Why this meal matches their feelings" },
    { "title": "Meal Name", "reason": "Why this meal matches their feelings" }
  ],
  "activities": [
    { "title": "Activity Name", "reason": "Why this activity matches their feelings" },
    { "title": "Activity Name", "reason": "Why this activity matches their feelings" },
    { "title": "Activity Name", "reason": "Why this activity matches their feelings" }
  ]
}

Always provide exactly 3 suggestions for each category. Return ONLY the raw JSON object, nothing else.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `How are you feeling? ${feeling}` },
      ],
      temperature: 0.8,
      max_tokens: 1500,
      stream: true,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        let stage = 'analyzing'; // analyzing -> books -> meals -> activities -> done

        try {
          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing', message: 'Analyzing your feelings...' })}\n\n`));
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              
              // Send progress updates based on content
              if (stage === 'analyzing' && fullContent.includes('"books"')) {
                stage = 'books';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'books', message: 'Finding books...' })}\n\n`));
              } else if (stage === 'books' && fullContent.includes('"meals"')) {
                stage = 'meals';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'meals', message: 'Finding meals...' })}\n\n`));
              } else if (stage === 'meals' && fullContent.includes('"activities"')) {
                stage = 'activities';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'activities', message: 'Finding activities...' })}\n\n`));
              }
            }
          }

          // Parse the complete JSON
          let jsonContent = fullContent.trim();
          
          // Remove markdown code blocks if present
          if (jsonContent.startsWith('```')) {
            jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          
          // Find JSON object boundaries
          const jsonStart = jsonContent.indexOf('{');
          const jsonEnd = jsonContent.lastIndexOf('}');
          
          if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            throw new Error('No valid JSON found in response');
          }
          
          jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
          
          const recommendations: Recommendations = JSON.parse(jsonContent);

          // Validate structure
          if (!recommendations.books || !recommendations.meals || !recommendations.activities) {
            throw new Error('Invalid response structure');
          }

          // Send the final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: recommendations })}\n\n`));
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI', details: error.message },
      { status: 500 }
    );
  }
}

