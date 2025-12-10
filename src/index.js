import { Bot, webhookCallback } from "grammy";
import i18next from 'i18next';

// Initialize i18next
i18next.init({
  lng: 'en',
  debug: false,
  resources: {
    en: {
      translation: {
        welcome: "🏋️‍♂️ Welcome to Body Shape Coach! I'm here to help you with fitness advice, workout plans, and nutrition tips. How can I assist you today?",
        help: "🤖 *Available Commands:*\n\n/start - Start the bot\n/help - Show this help message\n/workout - Get a personalized workout plan\n/nutrition - Get nutrition advice\n/progress - Track your fitness progress\n/chat - Chat with AI fitness coach\n\nJust send me a message and I'll help you with your fitness journey!",
        processing: "⏳ Processing your request...",
        error: "❌ Sorry, I encountered an error. Please try again later.",
        thanks: "🙏 Thank you for using Body Shape Coach!"
      }
    }
  }
});

export default {
  async fetch(request, env, ctx) {
    try {
      // Create bot instance
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN || "");
      
      // Helper function to call OpenAI API
      const callOpenAI = async (prompt) => {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are a professional fitness coach and nutrition expert. Provide helpful, accurate, and motivating advice about fitness, workouts, nutrition, and healthy lifestyle. Keep responses concise but informative. Encourage users in their fitness journey."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              max_tokens: 500,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const data = await response.json();
          return data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
        } catch (error) {
          console.error('OpenAI API error:', error);
          return "I'm having trouble connecting to my knowledge base. Please try again later.";
        }
      };

      // Command handlers
      bot.command("start", async (ctx) => {
        const userId = crypto.randomUUID();
        console.log(`New user started: ${userId}`);
        await ctx.reply(i18next.t('welcome'));
      });

      bot.command("help", async (ctx) => {
        await ctx.reply(i18next.t('help'), { parse_mode: "Markdown" });
      });

      bot.command("workout", async (ctx) => {
        await ctx.reply(i18next.t('processing'));
        
        const userInput = ctx.message?.text?.replace('/workout', '').trim() || 'general fitness';
        const prompt = `Generate a personalized workout plan for fitness. Include warm-up, main exercises, and cool-down. Focus on: ${userInput}`;
        
        const workoutPlan = await callOpenAI(prompt);
        await ctx.reply(workoutPlan);
      });

      bot.command("nutrition", async (ctx) => {
        await ctx.reply(i18next.t('processing'));
        
        const userInput = ctx.message?.text?.replace('/nutrition', '').trim() || 'balanced nutrition';
        const prompt = `Provide nutrition advice for fitness. Include meal suggestions, macronutrient guidance, and hydration tips. Focus on: ${userInput}`;
        
        const nutritionAdvice = await callOpenAI(prompt);
        await ctx.reply(nutritionAdvice);
      });

      bot.command("chat", async (ctx) => {
        await ctx.reply(i18next.t('processing'));
        
        const userMessage = ctx.message?.text?.replace('/chat', '').trim();
        if (!userMessage) {
          await ctx.reply("Please tell me what you'd like to chat about regarding fitness, workouts, or nutrition!");
          return;
        }
        
        const response = await callOpenAI(userMessage);
        await ctx.reply(response);
      });

      // Handle all other messages
      bot.on("message", async (ctx) => {
        const messageText = ctx.message.text;
        
        // Skip commands
        if (messageText.startsWith('/')) return;
        
        await ctx.reply(i18next.t('processing'));
        const response = await callOpenAI(messageText);
        await ctx.reply(response);
      });

      // Error handling
      bot.catch((err) => {
        console.error("Bot error:", err);
      });

      // Handle the request using webhook
      return await webhookCallback(bot, "cloudflare-mod")(request);
      
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: "Bot error occurred" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
