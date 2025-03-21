import OpenAI from 'openai';

// OpenAI API client configuration - Using environment variable for API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo purposes
});

export default openai; 