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
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('analyzing');
  const [progressMessage, setProgressMessage] = useState<string>('Analyzing your feelings...');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeling.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setRecommendations(null);
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
    <div className="glass-effect rounded-lg p-5 border border-neon-cyan/30 hover:border-neon-cyan/60 transition-all">
      <h3 className="text-xl font-semibold text-neon-cyan mb-2">{title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{reason}</p>
    </div>
  );

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold neon-text text-neon-cyan mb-3">
          MoodMatch
        </h1>
        <p className="text-gray-400 text-lg">Personalized recommendations based on how you feel</p>
      </div>

      {/* Input Section */}
      <div className="mb-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="space-y-4">
            <label htmlFor="feeling-input" className="block text-gray-300 text-sm font-medium mb-2">
              Tell me how you're feeling
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="feeling-input"
                type="text"
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                placeholder="e.g., I'm feeling stressed and overwhelmed..."
                className="flex-1 px-5 py-4 rounded-lg glass-effect border border-neon-cyan/50 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan text-white placeholder-gray-500 text-lg transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !feeling.trim()}
                className="px-8 py-4 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-blue text-black font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity neon-border text-lg whitespace-nowrap"
              >
                {isLoading ? 'Finding matches...' : 'Find Recommendations'}
              </button>
            </div>
            <p className="text-gray-500 text-sm text-center">
              Share your emotions, mood, or what's on your mind
            </p>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300">
          {error}
        </div>
      )}

      {/* Loading State with Progress */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-flex space-x-2 mb-6">
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-pulse delay-75"></div>
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-pulse delay-150"></div>
          </div>
          
          {/* Progress Stages */}
          <div className="max-w-md mx-auto space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-lg glass-effect transition-all ${
              progressStage === 'analyzing' ? 'border-neon-cyan border-2' : 'border-neon-cyan/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                progressStage === 'analyzing' ? 'bg-neon-cyan animate-pulse' : 'bg-gray-600'
              }`}></div>
              <span className={`text-sm ${progressStage === 'analyzing' ? 'text-neon-cyan' : 'text-gray-400'}`}>
                Analyzing your feelings...
              </span>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg glass-effect transition-all ${
              progressStage === 'books' ? 'border-neon-purple border-2' : 'border-neon-purple/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                progressStage === 'books' ? 'bg-neon-purple animate-pulse' : 'bg-gray-600'
              }`}></div>
              <span className={`text-sm ${progressStage === 'books' ? 'text-neon-purple' : 'text-gray-400'}`}>
                Finding books...
              </span>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg glass-effect transition-all ${
              progressStage === 'meals' ? 'border-neon-pink border-2' : 'border-neon-pink/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                progressStage === 'meals' ? 'bg-neon-pink animate-pulse' : 'bg-gray-600'
              }`}></div>
              <span className={`text-sm ${progressStage === 'meals' ? 'text-neon-pink' : 'text-gray-400'}`}>
                Finding meals...
              </span>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-lg glass-effect transition-all ${
              progressStage === 'activities' ? 'border-neon-blue border-2' : 'border-neon-blue/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                progressStage === 'activities' ? 'bg-neon-blue animate-pulse' : 'bg-gray-600'
              }`}></div>
              <span className={`text-sm ${progressStage === 'activities' ? 'text-neon-blue' : 'text-gray-400'}`}>
                Finding activities...
              </span>
            </div>
          </div>
          
          <p className="text-gray-400 mt-6 text-lg font-medium">{progressMessage}</p>
        </div>
      )}

      {/* Recommendations Display */}
      {recommendations && (
        <div className="animate-fade-in">
          {/* Three Column Layout */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-8">
            {/* Books Column */}
            <section className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-2xl">📚</div>
                <h2 className="text-2xl font-bold text-neon-purple neon-text">Books to Read</h2>
              </div>
              <div className="flex flex-col gap-4">
                {recommendations.books.map((book, index) => (
                  <RecommendationCard key={index} {...book} />
                ))}
              </div>
            </section>

            {/* Meals Column */}
            <section className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-2xl">🍽️</div>
                <h2 className="text-2xl font-bold text-neon-pink neon-text">Meals to Enjoy</h2>
              </div>
              <div className="flex flex-col gap-4">
                {recommendations.meals.map((meal, index) => (
                  <RecommendationCard key={index} {...meal} />
                ))}
              </div>
            </section>

            {/* Activities Column */}
            <section className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-2xl">✨</div>
                <h2 className="text-2xl font-bold text-neon-blue neon-text">Things to Do</h2>
              </div>
              <div className="flex flex-col gap-4">
                {recommendations.activities.map((activity, index) => (
                  <RecommendationCard key={index} {...activity} />
                ))}
              </div>
            </section>
          </div>

          {/* Reset Button */}
          <div className="text-center pt-6">
            <button
              onClick={() => {
                setRecommendations(null);
                setFeeling('');
              }}
              className="px-6 py-3 rounded-lg glass-effect border border-neon-cyan/50 text-neon-cyan hover:border-neon-cyan transition-colors"
            >
              Get New Recommendations
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!recommendations && !isLoading && !error && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">Share how you're feeling to get personalized recommendations</p>
          <p className="text-sm">I'll suggest books, meals, and activities that match your mood</p>
        </div>
      )}
    </div>
  );
}

