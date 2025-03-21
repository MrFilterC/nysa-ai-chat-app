interface MessageDisplay {
  text: string;
  type: string;
}

interface PasswordFormProps {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  changingPassword: boolean;
  passwordMessage: MessageDisplay;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function PasswordForm({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  changingPassword,
  passwordMessage,
  onSubmit
}: PasswordFormProps) {
  return (
    <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200">
      <h2 className="text-xl font-semibold mb-6 text-white">Change Password</h2>
      
      {passwordMessage.text && (
        <div className={`mb-4 p-3 rounded ${passwordMessage.type === 'error' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
          {passwordMessage.text}
        </div>
      )}
      
      <form onSubmit={onSubmit} className="space-y-6">
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
  );
} 