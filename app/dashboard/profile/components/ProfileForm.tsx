import { User } from '@supabase/supabase-js';

interface ProfileFormProps {
  user: User | null;
  username: string;
  setUsername: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  updating: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function ProfileForm({
  user,
  username,
  setUsername,
  fullName,
  setFullName,
  updating,
  onSubmit
}: ProfileFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 flex-1">
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
  );
} 