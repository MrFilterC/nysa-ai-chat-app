"use client";

import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Header from "../components/Header";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-gray-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header activePage="dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 shadow rounded-lg p-6 text-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-white">Welcome, {user?.user_metadata?.username || user?.email}!</h2>
          <p className="text-gray-300 mb-8">
            This is where you'll be able to interact with Nysa, your AI assistant.
          </p>
          
          <div className="mt-8 p-6 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Chat with Nysa</h3>
            <p className="text-gray-300 mb-4">
              Your personal AI assistant is ready to help you with any questions or tasks.
            </p>
            <button
              onClick={() => router.push('/dashboard/chat')}
              className="rounded-full bg-blue-500 text-white px-6 py-2 font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Start Chatting
            </button>
          </div>
          
          <div className="mt-6 border-t border-gray-700 pt-6">
            <Link
              href="/dashboard/profile"
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Edit your profile information
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 