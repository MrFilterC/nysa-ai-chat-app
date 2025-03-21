"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Image from 'next/image';
import WalletSection from './components/WalletSection';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export default function ProfilePage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProfile();
    }
  }, [user, isLoading, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      setMessage({ text: '', type: '' });
      
      // Check if username is already taken (if changed)
      if (username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .neq('id', user?.id)
          .single();
        
        if (existingUser) {
          setMessage({ text: 'Username is already taken', type: 'error' });
          return;
        }
      }
      
      const updates = {
        full_name: fullName,
        username,
        updated_at: new Date().toISOString(),
      };
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
      
      if (error) throw error;
      
      // Handle avatar upload if avatar file is selected
      if (avatar) {
        await uploadAvatar();
      }
      
      setMessage({ text: 'Profile updated successfully', type: 'success' });
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };
  
  const uploadAvatar = async () => {
    try {
      setUploading(true);
      
      if (!avatar || !user) return;
      
      // Create a unique file path
      const fileExt = avatar.name.split('.').pop();
      const filePath = `${user.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatar, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setAvatarUrl(data.publicUrl);
      setAvatar(null);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setMessage({ text: error.message || 'Failed to upload avatar', type: 'error' });
    } finally {
      setUploading(false);
    }
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setMessage({ text: 'Avatar image must be less than 2MB', type: 'error' });
      return;
    }
    
    setAvatar(file);
    
    // Preview the selected image
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setChangingPassword(true);
      setPasswordMessage({ text: '', type: '' });
      
      // Validate passwords
      if (newPassword.length < 8) {
        setPasswordMessage({ text: 'New password must be at least 8 characters', type: 'error' });
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setPasswordMessage({ text: 'New passwords do not match', type: 'error' });
        return;
      }
      
      if (!currentPassword) {
        setPasswordMessage({ text: 'Current password is required', type: 'error' });
        return;
      }
      
      // Sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });
      
      if (signInError) {
        setPasswordMessage({ text: 'Current password is incorrect', type: 'error' });
        return;
      }
      
      // Change password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setPasswordMessage({ 
        text: 'Password updated successfully. You will be logged out in a moment...', 
        type: 'success' 
      });
      
      // Reset form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Log out the user after a short delay
      setTimeout(async () => {
        await signOut();
        router.push('/login?message=Password has been changed. Please log in with your new password.');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordMessage({ text: error.message || 'Failed to change password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-gray-200">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header activePage="profile" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Information Section */}
        <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200 mb-6">
          <h2 className="text-xl font-semibold mb-6 text-white">Profile Information</h2>
          
          {message.text && (
            <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
              {message.text}
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-600">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                    {username ? username[0].toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              
              <button
                onClick={triggerFileInput}
                disabled={uploading}
                className="text-sm bg-gray-700 text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-600 transition-colors"
              >
                {uploading ? 'Uploading...' : 'Change Avatar'}
              </button>
              
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Choose a square image, max 2MB. The image will be displayed as a circle.
              </p>
            </div>
            
            {/* Profile Form */}
            <form onSubmit={updateProfile} className="space-y-6 flex-1">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-gray-300"
                />
                <p className="mt-1 text-xs text-gray-400">Your email cannot be changed</p>
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-full bg-blue-500 text-white px-6 py-2 font-medium hover:bg-blue-600 transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {updating ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Wallet Section */}
        <WalletSection user={user} />
        
        {/* Password Change Section */}
        <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200">
          <h2 className="text-xl font-semibold mb-6 text-white">Change Password</h2>
          
          {passwordMessage.text && (
            <div className={`mb-4 p-3 rounded ${passwordMessage.type === 'error' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
              {passwordMessage.text}
            </div>
          )}
          
          <form onSubmit={changePassword} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Must be at least 8 characters</p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="rounded-full bg-blue-500 text-white px-6 py-2 font-medium hover:bg-blue-600 transition-colors disabled:opacity-70 cursor-pointer"
              >
                {changingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 