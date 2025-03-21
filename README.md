# NYSA AI Chat

NYSA AI is a modern chat application powered by OpenAI's language models. It offers a seamless conversational experience with credit-based usage, user authentication, and wallet integration.

## Features

- 🤖 AI-powered chat assistant using OpenAI's API
- 💳 Credit system for managing chat usage
- 👤 User authentication with Supabase
- 💼 Wallet integration for NYSA tokens
- 🔄 Token conversion to site credits
- 🌐 Full-stack Next.js application

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nysa-ai.git
   cd nysa-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and update with your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Update the environment variables in `.env.local` with your Supabase and OpenAI credentials.

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Credit System

The application uses a credit system to manage chat usage:
- Each message sent to the AI costs 10 credits
- Users can convert NYSA tokens to credits
- The system checks for sufficient credits before processing messages

## Deployment

This application can be easily deployed to Vercel:

1. Push your code to a GitHub repository
2. Connect your Vercel account to your GitHub repository
3. Configure the environment variables in the Vercel dashboard
4. Deploy the application

## License

[MIT](LICENSE)
