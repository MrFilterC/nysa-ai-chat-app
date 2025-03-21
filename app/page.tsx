import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold">Welcome to Nysa's World</h1>
        
        <div className="flex gap-4 mt-8">
          <Link
            href="/login"
            className="rounded-full bg-blue-500 text-white px-6 py-2 font-medium hover:bg-blue-600 transition-colors"
          >
            Login
          </Link>
          
          <Link
            href="/register"
            className="rounded-full border border-blue-500 text-blue-500 px-6 py-2 font-medium hover:bg-blue-50 transition-colors"
          >
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
