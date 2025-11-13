'use client';

import { useState } from 'react';

interface Recommendation {
  title: string;
  reason: string;
}

interface Recommendations {
  books: Recommendation[];
  meals: Recommendation[];
  activities: Recommendation[];
}

export default function RecommendationSystem() {
  const [feeling, setFeeling] = useState('');
  const [recommendations, setRecommendations] = useState<Partial<Recommendations>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('analyzing');
  const [progressMessage, setProgressMessage] = useState<string>('Analyzing your feelings...');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeling.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setRecommendations({});
    setProgressStage('analyzing');
    setProgressMessage('Analyzing your feelings...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feeling }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get recommendations');
        } catch {
          throw new Error('Failed to get recommendations');
        }
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setProgressStage(data.stage);
                setProgressMessage(data.message);
              } else if (data.type === 'partial') {
                // Update recommendations with partial data as it arrives
                setRecommendations((prev) => ({
                  ...prev,
                  [data.section]: data.data,
                }));
              } else if (data.type === 'complete') {
                setRecommendations(data.data);
                setIsLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error: any) {
      setError(error.message || 'Sorry, I encountered an error. Please try again.');
      setIsLoading(false);
    }
  };

  const RecommendationCard = ({ title, reason }: Recommendation) => (
    <div className="md-card md-elevation-2 bg-white rounded p-5 hover:md-elevation-4 h-full flex flex-col">
      <h3 className="text-lg font-medium text-gray-900 mb-2 flex-shrink-0">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed flex-grow">{reason}</p>
    </div>
  );

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-12 pt-8">
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-3">
          MoodMatch
        </h1>
        <p className="text-gray-600 text-base">Personalized recommendations based on how you feel</p>
      </div>

      {/* Input Section */}
      <div className="mb-12">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="md-card md-elevation-2 bg-white rounded-lg p-6">
            <label htmlFor="feeling-input" className="block text-gray-700 text-sm font-medium mb-4">
              Tell me how you're feeling
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  id="feeling-input"
                  type="text"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="e.g., I'm feeling stressed and overwhelmed..."
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:border-purple-500 focus:bg-white text-gray-900 placeholder-gray-500 text-base transition-all"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !feeling.trim()}
                className="md-button bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-md"
              >
                {isLoading ? 'Finding matches...' : 'Find Recommendations'}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-4 text-center">
              Share your emotions, mood, or what's on your mind
            </p>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto mb-6 p-4 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700 md-elevation-1">
          {error}
        </div>
      )}

      {/* Loading State with Progress */}
      {isLoading && (
        <div className="py-12">
          <div className="max-w-4xl mx-auto">
            {/* Horizontal Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{progressMessage}</span>
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    progressStage === 'analyzing' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <div className={`w-2 h-2 rounded-full ${
                    progressStage === 'books' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <div className={`w-2 h-2 rounded-full ${
                    progressStage === 'meals' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <div className={`w-2 h-2 rounded-full ${
                    progressStage === 'activities' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: progressStage === 'analyzing' ? '25%' :
                           progressStage === 'books' ? '50%' :
                           progressStage === 'meals' ? '75%' :
                           progressStage === 'activities' ? '100%' : '0%'
                  }}
                ></div>
              </div>
            </div>

            {/* Horizontal Progress Stages */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white md-elevation-1 transition-all ${
                progressStage === 'analyzing' ? 'border-2 border-purple-600' : 'border-2 border-transparent'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  progressStage === 'analyzing' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                }`}></div>
                <span className={`text-xs md:text-sm whitespace-nowrap ${
                  progressStage === 'analyzing' ? 'text-purple-600 font-medium' : 'text-gray-500'
                }`}>
                  Analyzing
                </span>
              </div>
              
              <div className="text-gray-300">→</div>
              
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white md-elevation-1 transition-all ${
                progressStage === 'books' ? 'border-2 border-purple-600' : 'border-2 border-transparent'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  progressStage === 'books' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                }`}></div>
                <span className={`text-xs md:text-sm whitespace-nowrap ${
                  progressStage === 'books' ? 'text-purple-600 font-medium' : 'text-gray-500'
                }`}>
                  Books
                </span>
              </div>
              
              <div className="text-gray-300">→</div>
              
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white md-elevation-1 transition-all ${
                progressStage === 'meals' ? 'border-2 border-purple-600' : 'border-2 border-transparent'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  progressStage === 'meals' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                }`}></div>
                <span className={`text-xs md:text-sm whitespace-nowrap ${
                  progressStage === 'meals' ? 'text-purple-600 font-medium' : 'text-gray-500'
                }`}>
                  Meals
                </span>
              </div>
              
              <div className="text-gray-300">→</div>
              
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white md-elevation-1 transition-all ${
                progressStage === 'activities' ? 'border-2 border-purple-600' : 'border-2 border-transparent'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  progressStage === 'activities' ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'
                }`}></div>
                <span className={`text-xs md:text-sm whitespace-nowrap ${
                  progressStage === 'activities' ? 'text-purple-600 font-medium' : 'text-gray-500'
                }`}>
                  Activities
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Display */}
      {(recommendations.books || recommendations.meals || recommendations.activities) && (
        <div className="animate-fade-in">
          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8">
            {/* Books Column */}
            {recommendations.books && (
              <section className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                  <div className="text-2xl">📚</div>
                  <h2 className="text-xl font-medium text-gray-900">Books to Read</h2>
                </div>
                <div className="flex flex-col gap-4 flex-grow">
                  {recommendations.books.map((book, index) => (
                    <RecommendationCard key={index} {...book} />
                  ))}
                </div>
              </section>
            )}

            {/* Meals Column */}
            {recommendations.meals && (
              <section className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                  <div className="text-2xl">🍽️</div>
                  <h2 className="text-xl font-medium text-gray-900">Meals to Enjoy</h2>
                </div>
                <div className="flex flex-col gap-4 flex-grow">
                  {recommendations.meals.map((meal, index) => (
                    <RecommendationCard key={index} {...meal} />
                  ))}
                </div>
              </section>
            )}

            {/* Activities Column */}
            {recommendations.activities && (
              <section className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                  <div className="text-2xl">✨</div>
                  <h2 className="text-xl font-medium text-gray-900">Things to Do</h2>
                </div>
                <div className="flex flex-col gap-4 flex-grow">
                  {recommendations.activities.map((activity, index) => (
                    <RecommendationCard key={index} {...activity} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Reset Button */}
          {recommendations.books && recommendations.meals && recommendations.activities && (
            <div className="text-center pt-6">
              <button
                onClick={() => {
                  setRecommendations({});
                  setFeeling('');
                }}
                className="md-button bg-white text-purple-600 border border-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg font-medium transition-all shadow-sm"
              >
                Get New Recommendations
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!recommendations.books && !recommendations.meals && !recommendations.activities && !isLoading && !error && (
        <div className="text-center py-16">
          <div className="md-card md-elevation-1 bg-white rounded-lg p-8 max-w-md mx-auto">
            <p className="text-lg text-gray-700 mb-2">Share how you're feeling to get personalized recommendations</p>
            <p className="text-sm text-gray-500">I'll suggest books, meals, and activities that match your mood</p>
          </div>
        </div>
      )}
    </div>
  );
}

