import { useChat } from '../../../contexts/ChatContext';
import { MESSAGE_CREDIT_COST } from '../../../lib/chatService';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function CreditDisplay() {
  const { chatState } = useChat();
  const [displayCredits, setDisplayCredits] = useState<number>(chatState.currentCredits || 0);
  
  // Periodically refresh credits from database
  useEffect(() => {
    // Update local display when state changes
    setDisplayCredits(chatState.currentCredits || 0);
    
    // Also set up a refresh interval to ensure credits are always up to date
    const fetchCreditsDirectly = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching credit update:', error);
          return;
        }
        
        const freshCredits = parseFloat(data.credits) || 0;
        if (freshCredits !== displayCredits) {
          console.log(`Credit refresh: ${displayCredits} -> ${freshCredits}`);
          setDisplayCredits(freshCredits);
        }
      } catch (error) {
        console.error('Failed to refresh credits:', error);
      }
    };
    
    // Initial fetch
    fetchCreditsDirectly();
    
    // Set up periodic refresh
    const interval = setInterval(fetchCreditsDirectly, 5000);
    return () => clearInterval(interval);
  }, [chatState.currentCredits]);
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 text-sm">
      <div className="flex items-center">
        <span className="text-gray-400 mr-2">Credits:</span>
        <span className={`font-bold ${displayCredits < MESSAGE_CREDIT_COST ? 'text-red-400' : 'text-green-400'}`}>
          {displayCredits}
        </span>
      </div>
      <div className="text-gray-400">
        Each message costs <span className="text-white font-medium">{MESSAGE_CREDIT_COST}</span> credits
      </div>
    </div>
  );
} 