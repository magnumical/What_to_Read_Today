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
      model: "gpt-3.5-turbo", // Fastest and most cost-effective option
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
        let sentBooks = false;
        let sentMeals = false;
        let sentActivities = false;

        // Helper function to extract JSON array from partial content
        const extractArray = (content: string, key: string): Recommendation[] | null => {
          try {
            const keyIndex = content.indexOf(`"${key}"`);
            if (keyIndex === -1) return null;
            
            // Find the array start after the key
            const arrayStart = content.indexOf('[', keyIndex);
            if (arrayStart === -1) return null;
            
            // Find matching closing bracket
            let bracketCount = 0;
            let arrayEnd = -1;
            for (let i = arrayStart; i < content.length; i++) {
              if (content[i] === '[') bracketCount++;
              if (content[i] === ']') bracketCount--;
              if (bracketCount === 0) {
                arrayEnd = i;
                break;
              }
            }
            
            if (arrayEnd === -1) return null;
            
            // Try to parse the array
            const arrayStr = content.substring(arrayStart, arrayEnd + 1);
            const parsed = JSON.parse(arrayStr);
            
            // Check if we have 3 complete items
            if (Array.isArray(parsed) && parsed.length === 3 && 
                parsed.every((item: any) => item.title && item.reason)) {
              return parsed;
            }
          } catch {
            // Not ready yet
          }
          return null;
        };

        try {
          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'analyzing', message: 'Analyzing your feelings...' })}\n\n`));
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              
              // Try to extract and send books section when complete
              if (!sentBooks) {
                const books = extractArray(fullContent, 'books');
                if (books) {
                  sentBooks = true;
                  stage = 'books';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'books', message: 'Finding books...' })}\n\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', section: 'books', data: books })}\n\n`));
                }
              }
              
              // Try to extract and send meals section when complete
              if (sentBooks && !sentMeals) {
                const meals = extractArray(fullContent, 'meals');
                if (meals) {
                  sentMeals = true;
                  stage = 'meals';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'meals', message: 'Finding meals...' })}\n\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', section: 'meals', data: meals })}\n\n`));
                }
              }
              
              // Try to extract and send activities section when complete
              if (sentMeals && !sentActivities) {
                const activities = extractArray(fullContent, 'activities');
                if (activities) {
                  sentActivities = true;
                  stage = 'activities';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', stage: 'activities', message: 'Finding activities...' })}\n\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', section: 'activities', data: activities })}\n\n`));
                }
              }
            }
          }

          // Parse the complete JSON as fallback
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

          // Send any missing sections
          if (!sentBooks && recommendations.books) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', section: 'books', data: recommendations.books })}\n\n`));
          }
          if (!sentMeals && recommendations.meals) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', section: 'meals', data: recommendations.meals })}\n\n`));
          }
          if (!sentActivities && recommendations.activities) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'partial', section: 'activities', data: recommendations.activities })}\n\n`));
          }

          // Send the final complete result
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

