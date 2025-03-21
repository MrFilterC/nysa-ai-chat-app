import AvatarUpload from './AvatarUpload';
import ProfileForm from './ProfileForm';
import { User } from '@supabase/supabase-js';

interface MessageDisplay {
  text: string;
  type: string;
}

interface ProfileInfoProps {
  user: User | null;
  username: string;
  setUsername: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  updating: boolean;
  avatarUrl: string | null;
  uploading: boolean;
  message: MessageDisplay;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateProfile: (e: React.FormEvent) => Promise<void>;
}

export default function ProfileInfo({
  user,
  username,
  setUsername,
  fullName,
  setFullName,
  updating,
  avatarUrl,
  uploading,
  message,
  handleAvatarChange,
  updateProfile
}: ProfileInfoProps) {
  return (
    <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200 mb-6">
      <h2 className="text-xl font-semibold mb-6 text-white">Profile Information</h2>
      
      {message.text && (
        <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
          {message.text}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Avatar Section */}
        <AvatarUpload 
          avatarUrl={avatarUrl}
          username={username}
          uploading={uploading}
          handleAvatarChange={handleAvatarChange}
        />
        
        {/* Profile Form */}
        <ProfileForm 
          user={user}
          username={username}
          setUsername={setUsername}
          fullName={fullName}
          setFullName={setFullName}
          updating={updating}
          onSubmit={updateProfile}
        />
      </div>
    </div>
  );
} 