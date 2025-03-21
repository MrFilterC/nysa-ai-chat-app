"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import Image from 'next/image';
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface HeaderProps {
  activePage: 'dashboard' | 'profile';
}

export default function Header({ activePage }: HeaderProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const getProfileInfo = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();
          
          if (data) {
            setUsername(data.username || user.email?.split('@')[0] || 'User');
            setAvatarUrl(data.avatar_url);
          } else {
            setUsername(user.email?.split('@')[0] || 'User');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          setUsername(user.email?.split('@')[0] || 'User');
        }
      }
    };
    
    getProfileInfo();
  }, [user]);

  const goToProfile = () => {
    router.push('/dashboard/profile');
  };

  return (
    <div className="bg-gray-900 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 
              onClick={() => router.push('/dashboard')}
              className="text-2xl font-bold text-white cursor-pointer hover:text-blue-300 transition-colors"
            >
              Nysa's World
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className={`${activePage === 'dashboard' 
                ? 'text-blue-400 font-medium' 
                : 'text-gray-300 hover:text-white'} cursor-pointer`}
            >
              Dashboard
            </button>
            <span className="text-gray-600">|</span>
            {user && (
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={goToProfile}
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={goToProfile}
                  className={`text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${
                    activePage === 'profile' ? 'bg-gray-700 text-white' : ''
                  }`}
                >
                  {username}
                </button>
                <button
                  onClick={signOut}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 