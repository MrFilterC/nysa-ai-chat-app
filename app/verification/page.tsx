"use client";

import Link from "next/link";

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-4xl font-bold">Check Your Email</h1>
          <p className="mt-4 text-gray-600">
            We've sent a verification link to your email address. Please click the link to verify your account.
          </p>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg">
          <p className="text-sm text-blue-700">
            If you don't see the email, check your spam folder. The email might take a few minutes to arrive.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/login"
            className="font-medium text-blue-500 hover:text-blue-600"
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
} 