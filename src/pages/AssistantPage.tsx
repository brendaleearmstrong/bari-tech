import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useUserProfile } from '../hooks/useUserProfile';
import { MessageCircle, Send, Mic, Camera, Sparkles } from 'lucide-react';

export function AssistantPage() {
  const { profile } = useUserProfile();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I am your Bari Coach. I can help you with meal planning, answer questions about your bariatric journey, and provide motivation. How can I help you today?',
    },
  ]);

  const suggestedQuestions = [
    'What can I eat for breakfast?',
    'How much protein do I need today?',
    'What are good snack options?',
    'Help me plan my meals for tomorrow',
  ];

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    setTimeout(() => {
      const responses = [
        'Based on your current phase, I recommend focusing on high-protein, easy-to-digest foods. Would you like me to suggest specific meals from your meal directory?',
        'Your daily protein target is around ' + (profile?.current_weight_kg ? Math.round(profile.current_weight_kg * 1.5) : 80) + 'g. You can achieve this by eating protein-rich foods at every meal. Would you like meal suggestions?',
        'Great question! For your phase, I recommend Greek yogurt, protein shakes, soft-cooked eggs, or cottage cheese. These are all high in protein and easy to digest.',
        'I can help you create a personalized meal plan! Based on your surgery type and current phase, I will recommend meals that meet your protein and calorie targets. Would you like me to start planning?',
        'Remember to stay hydrated! Your daily water target is around ' + (profile?.current_weight_kg ? Math.round(profile.current_weight_kg * 30) : 1800) + 'ml. Sip water throughout the day, but avoid drinking 30 minutes before and after meals.',
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: randomResponse,
        },
      ]);
    }, 1000);

    setMessage('');
  };

  const handleSuggestion = (question: string) => {
    setMessage(question);
  };

  return (
    <Layout>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6">
          <h1 className="text-2xl font-bold flex items-center">
            <MessageCircle className="w-7 h-7 mr-3" />
            Bari Coach
          </h1>
          <p className="text-teal-100 mt-1 flex items-center">
            <Sparkles className="w-4 h-4 mr-1" />
            Your personal bariatric lifestyle companion
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={"flex " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={"max-w-md px-4 py-3 rounded-2xl " + (msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-900')}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {messages.length === 1 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-600 mb-3">Try asking:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestion(question)}
                    className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors border border-gray-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <button className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Take photo">
              <Camera className="w-5 h-5" />
            </button>
            <button className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Voice input">
              <Mic className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your bariatric journey..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            AI responses are demo mode. Voice and image features coming soon.
          </p>
        </div>
      </div>
    </Layout>
  );
}
