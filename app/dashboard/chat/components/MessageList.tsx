import { Message } from '@/app/types/chat';
import { useRef, useEffect, useState } from 'react';
import TypewriterText from './animations/TypewriterText';
import TypingAnimation from './animations/TypingAnimation';

interface MessageListProps {
  messages: Message[];
  pendingMessageId: string | null;
  isTyping: boolean;
  chatIsLoading: boolean;
}

export default function MessageList({ 
  messages, 
  pendingMessageId, 
  isTyping, 
  chatIsLoading 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [animatedMessages, setAnimatedMessages] = useState<{[key: number]: boolean}>({});

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageAnimationComplete = (index: number) => {
    setAnimatedMessages(prev => ({ ...prev, [index]: true }));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Welcome to Nysa AI</h3>
          <p className="text-gray-400 max-w-md">
            Start a conversation with Nysa. She can help answer questions, provide information, or just chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
      {messages.map((message: Message, index: number) => {
        // Skip rendering if this is the pending message that has been processed
        if (pendingMessageId && 
            message.role === 'user' && 
            message.timestamp?.toString() === pendingMessageId) {
          return null;
        }
        
        return (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3/4 rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              <div className="mb-1">
                <span className="font-medium">
                  {message.role === 'user' ? 'You' : 'Nysa'}
                </span>
                {message.timestamp && (
                  <span className="text-xs opacity-70 ml-2">
                    {formatDate(message.timestamp)}
                  </span>
                )}
              </div>
              {message.role === 'assistant' && index === messages.length - 1 && !animatedMessages[index] ? (
                <TypewriterText 
                  text={message.content} 
                  onComplete={() => handleMessageAnimationComplete(index)}
                />
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Pending user message */}
      {pendingMessageId && (
        <div className="flex justify-end">
          <div className="max-w-3/4 rounded-lg px-4 py-2 bg-blue-600/70 text-white">
            <div className="mb-1">
              <span className="font-medium">You</span>
              <span className="text-xs opacity-70 ml-2">
                {formatDate(Number(pendingMessageId))}
              </span>
            </div>
            <div className="whitespace-pre-wrap">Sending...</div>
          </div>
        </div>
      )}
      
      {/* Typing indicator */}
      {isTyping && !chatIsLoading && (
        <div className="flex justify-start">
          <div className="max-w-3/4 rounded-lg px-4 py-2 bg-gray-700 text-gray-200">
            <div className="mb-1">
              <span className="font-medium">Nysa</span>
            </div>
            <TypingAnimation />
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
} 