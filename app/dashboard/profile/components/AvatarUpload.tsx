import { useRef } from 'react';
import Image from 'next/image';

interface AvatarUploadProps {
  avatarUrl: string | null;
  username: string;
  uploading: boolean;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AvatarUpload({
  avatarUrl,
  username,
  uploading,
  handleAvatarChange
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
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
  );
} 