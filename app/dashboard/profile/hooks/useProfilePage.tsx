import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

interface MessageDisplay {
  text: string;
  type: string;
}

export function useProfilePage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState<MessageDisplay>({ text: '', type: '' });
  const [passwordMessage, setPasswordMessage] = useState<MessageDisplay>({ text: '', type: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      const filePath = `avatars/${user.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatar);
      
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

  return {
    user,
    isLoading,
    loading,
    updating,
    uploading,
    changingPassword,
    fullName,
    setFullName,
    username,
    setUsername,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    avatarUrl,
    message,
    passwordMessage,
    updateProfile,
    handleAvatarChange,
    changePassword
  };
} 