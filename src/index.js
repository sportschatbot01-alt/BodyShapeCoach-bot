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
        help: "🤖 *Available Commands:*\n\n/start - Start the bot\n/help - Show this help message\n/workout - Get a personalized workout plan\n/nutrition - Get nutrition advice\n/chat - Chat with AI fitness coach\n\nJust send me a message and I'll help you with your fitness journey!",
        processing: "⏳ Processing your request...",
        error: "❌ Sorry, I encountered an error. Please try again later.",
        thanks: "🙏 Thank you for using Body Shape Coach!"
      }
    }
  }
});

// In-memory storage for user states (consider KV for production)
const userStates = new Map();

// Conversation states
const CONVERSATION_STATE = {
  START: 'start',
  ASKING_NAME: 'asking_name',
  ASKING_AGE: 'asking_age',
  ASKING_GOALS: 'asking_goals',
  ASKING_WEIGHT: 'asking_weight',
  ASKING_HEIGHT: 'asking_height',
  READY: 'ready',
  IN_CHAT: 'in_chat'
};

// Initial greeting and questions - using i18next for base welcome
const GREETING_MESSAGE = `${i18next.t('welcome')}

Let's start by getting to know you better so I can provide personalized advice.`;

const QUESTIONS = {
  name: "What's your name?",
  age: "How old are you? (e.g., 25)",
  goals: `What are your fitness goals? Choose or describe:
• 🏃 Weight loss
• 💪 Muscle gain
• 🔥 Toning & definition
• 🏋️‍♂️ Strength building
• 🧘‍♂️ General fitness
• 📈 Endurance improvement`,
  weight: "What's your current weight in kg? (e.g., 75)",
  height: "What's your height in cm? (e.g., 175)"
};

// Quick responses that don't need OpenAI
const QUICK_RESPONSES = {
  'hello': "Hello! How can I assist you with your fitness journey today?",
  'hi': "Hi there! Ready to work on your fitness goals?",
  'hey': "Hey! How's your fitness journey going?",
  'thanks': i18next.t('thanks'),
  'thank you': i18next.t('thanks'),
  'thank': i18next.t('thanks'),
  'help': `🤖 *Available Commands & Features:*

📋 *Profile Commands:*
/start - Start/restart your profile setup
/profile - View your current profile
/update - Update your profile information

💪 *Fitness Features:*
/workout [goal] - Get personalized workout plan
/nutrition [goal] - Get nutrition advice
/plan - Get weekly fitness plan
/tip - Get random fitness tip

💬 *Chat Features:*
/chat [message] - Chat with AI fitness coach
/ask [question] - Ask specific fitness question

❓ *Help:*
/help - Show help message
/commands - List all commands

Just send me a message and I'll help you reach your fitness goals!`,
  'what can you do': `As your Body Shape Coach, I can:

🎯 *Personalized Planning:*
• Create custom workout routines
• Design nutrition plans
• Set achievable fitness goals
• Track your progress

💪 *Expert Guidance:*
• Exercise demonstrations
• Form correction tips
• Recovery advice
• Motivation & accountability

🥗 *Nutrition Support:*
• Meal planning
• Macronutrient guidance
• Supplement advice
• Hydration tracking

📊 *Progress Tracking:*
• Set milestones
• Adjust plans as you progress
• Celebrate achievements

Just tell me your goals and let's get started!`
};

export default {
  async fetch(request, env, ctx) {
    try {
      // Create bot instance
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

      // Helper function to call OpenAI API - MANUAL REST API (no SDK)
      const callOpenAI = async (prompt, userContext = null) => {
        try {
          let systemMessage = "You are a professional fitness coach and nutrition expert. Provide helpful, accurate, and motivating advice about fitness, workouts, nutrition, and healthy lifestyle. Keep responses concise but informative. Encourage users in their fitness journey.";
          
          // Add user context if available
          if (userContext) {
            systemMessage = `You are a professional fitness coach and nutrition expert. You are talking to ${userContext.name}, ${userContext.age} years old, ${userContext.height}cm tall, ${userContext.weight}kg, with the goal: ${userContext.goals}. Provide personalized, practical fitness advice based on their profile. Be encouraging but honest. Keep responses concise but informative.`;
          }

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
                  content: systemMessage
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              max_tokens: 600,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const data = await response.json();
          return data.choices[0]?.message?.content || i18next.t('error');
        } catch (error) {
          console.error('OpenAI API error:', error);
          return i18next.t('error');
        }
      };

      // Generate fallback response based on user profile
      const generateFallbackResponse = (userData, userMessage) => {
        const lowerMessage = userMessage.toLowerCase();
        const userGoals = userData.goals.toLowerCase();
        
        if (lowerMessage.includes('workout') || lowerMessage.includes('exercise')) {
          return `Based on your goal to "${userData.goals}", here's a starter workout plan:

💪 *Weekly Schedule:*
• Monday: Full Body Strength (3 sets x 10 reps)
• Tuesday: Cardio (30 mins)
• Wednesday: Active Recovery (stretching)
• Thursday: Upper Body Focus
• Friday: Lower Body Focus
• Saturday: Cardio (30 mins)
• Sunday: Rest

🏋️‍♂️ *Key Exercises:*
1. Squats/Lunges
2. Push-ups/Modified push-ups
3. Planks (30-60 seconds)
4. Dumbbell rows
5. Glute bridges

${i18next.t('thanks')} Start with light weights and focus on form! Need a more specific plan?`;
        }
        
        if (lowerMessage.includes('diet') || lowerMessage.includes('nutrition') || lowerMessage.includes('eat')) {
          return `🥗 *Nutrition Tips for ${userData.goals}:*

📊 *Daily Targets:*
• Protein: ${Math.round(userData.weight * 1.6)}g (for muscle)
• Carbs: Adjust based on activity
• Healthy fats: 40-60g
• Water: 3-4 liters

🍽️ *Meal Structure:*
• Breakfast: Protein + Complex carbs
• Lunch: Protein + Veggies + Healthy fats
• Dinner: Protein + Veggies
• Snacks: Fruits, nuts, yogurt

${i18next.t('thanks')} Want specific meal ideas?`;
        }
        
        if (lowerMessage.includes('weight') && userGoals.includes('loss')) {
          return `For weight loss at ${userData.age}, aim for:
• 300-500 calorie deficit daily
• 10,000+ steps per day
• Strength training 3x/week
• High protein intake
• 7-8 hours sleep nightly

${i18next.t('thanks')} Track your progress weekly!`;
        }
        
        return `Based on your goal to "${userData.goals}", consistency is key! Start with 3 workouts/week, track your nutrition, and adjust based on progress. ${i18next.t('thanks')} Need specific advice?`;
      };

      // Profile summary function
      const getProfileSummary = (userData) => {
        return `📋 *Your Profile Summary:*
        
👤 *Personal Info:*
• Name: ${userData.name}
• Age: ${userData.age}
• Height: ${userData.height} cm
• Weight: ${userData.weight} kg

🎯 *Fitness Goals:*
${userData.goals}

💪 *Recommended Daily Calories:* ~${Math.round(userData.weight * 30)} kcal
🥗 *Protein Target:* ${Math.round(userData.weight * 1.6)}g daily
💧 *Water Intake:* 3-4 liters daily

${i18next.t('thanks')} Ready to achieve your goals! Use /workout, /nutrition, or just chat with me!`;
      };

      // Clean up old states (older than 24 hours)
      const cleanupOldStates = () => {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        for (const [userId, data] of userStates.entries()) {
          if (data.timestamp && data.timestamp < oneDayAgo) {
            userStates.delete(userId);
          }
        }
      };

      // Run cleanup
      cleanupOldStates();

      // Start command with conversation flow - using i18next welcome
      bot.command("start", async (ctx) => {
        const userId = ctx.from.id;
        
        userStates.set(userId, {
          state: CONVERSATION_STATE.ASKING_NAME,
          data: {},
          timestamp: Date.now()
        });
        
        await ctx.reply(GREETING_MESSAGE, { parse_mode: "Markdown" });
        await ctx.reply(QUESTIONS.name);
      });

      // Profile command
      bot.command("profile", async (ctx) => {
        const userId = ctx.from.id;
        const userData = userStates.get(userId)?.data;
        
        if (userData && userData.name) {
          await ctx.reply(getProfileSummary(userData), { parse_mode: "Markdown" });
        } else {
          await ctx.reply("You haven't set up your profile yet. Use /start to begin!", { parse_mode: "Markdown" });
        }
      });

      // Update command
      bot.command("update", async (ctx) => {
        const userId = ctx.from.id;
        
        userStates.set(userId, {
          state: CONVERSATION_STATE.ASKING_NAME,
          data: {},
          timestamp: Date.now()
        });
        
        await ctx.reply("Let's update your profile! What's your name?", { parse_mode: "Markdown" });
      });

      // Help command - using i18next help
      bot.command("help", async (ctx) => {
        await ctx.reply(i18next.t('help'), { parse_mode: "Markdown" });
      });

      bot.command("commands", async (ctx) => {
        await ctx.reply(i18next.t('help'), { parse_mode: "Markdown" });
      });

      // Workout command - updated to use user context
      bot.command("workout", async (ctx) => {
        const userId = ctx.from.id;
        const userData = userStates.get(userId)?.data;
        
        if (!userData || !userData.name) {
          await ctx.reply("Please set up your profile first with /start to get personalized workout plans!");
          return;
        }
        
        await ctx.reply(i18next.t('processing'));
        
        const userInput = ctx.message?.text?.replace('/workout', '').trim() || userData.goals;
        const prompt = `Generate a detailed, personalized workout plan for ${userData.name}, ${userData.age} years old, ${userData.height}cm, ${userData.weight}kg, with goal: ${userData.goals}. Focus on: ${userInput}. Include warm-up, exercises with sets/reps, cool-down, and progression tips.`;
        
        const workoutPlan = await callOpenAI(prompt, userData);
        await ctx.reply(workoutPlan);
      });

      // Nutrition command - updated to use user context
      bot.command("nutrition", async (ctx) => {
        const userId = ctx.from.id;
        const userData = userStates.get(userId)?.data;
        
        if (!userData || !userData.name) {
          await ctx.reply("Please set up your profile first with /start to get personalized nutrition advice!");
          return;
        }
        
        await ctx.reply(i18next.t('processing'));
        
        const userInput = ctx.message?.text?.replace('/nutrition', '').trim() || userData.goals;
        const prompt = `Provide personalized nutrition advice for ${userData.name}, ${userData.age} years old, ${userData.height}cm, ${userData.weight}kg, with goal: ${userData.goals}. Focus on: ${userInput}. Include daily calorie target, macronutrient breakdown, meal timing, food suggestions, and hydration.`;
        
        const nutritionAdvice = await callOpenAI(prompt, userData);
        await ctx.reply(nutritionAdvice);
      });

      // Plan command - new feature
      bot.command("plan", async (ctx) => {
        const userId = ctx.from.id;
        const userData = userStates.get(userId)?.data;
        
        if (!userData || !userData.name) {
          await ctx.reply("Please set up your profile first with /start to get a personalized plan!");
          return;
        }
        
        await ctx.reply(i18next.t('processing'));
        
        const prompt = `Create a complete 7-day fitness plan for ${userData.name}, ${userData.age} years old, ${userData.height}cm, ${userData.weight}kg, with goal: ${userData.goals}. Include daily workouts, nutrition guidelines, rest days, and progress tracking tips.`;
        
        const weeklyPlan = await callOpenAI(prompt, userData);
        await ctx.reply(weeklyPlan);
      });

      // Tip command - new feature
      bot.command("tip", async (ctx) => {
        const tips = [
          "💧 Drink water first thing in the morning to kickstart metabolism!",
          "🏋️‍♂️ Focus on form over weight - better to lift light correctly than heavy poorly!",
          "🥗 Include protein in every meal to support muscle repair and growth!",
          "😴 Get 7-9 hours of sleep - recovery is when muscles grow!",
          "📱 Track your workouts to see progress over time!",
          "🔥 HIIT workouts can burn more calories in less time!",
          "🧘‍♂️ Don't skip stretching - flexibility prevents injuries!",
          "🥑 Healthy fats are essential for hormone production!",
          "💪 Progressive overload - gradually increase weight or reps!",
          "🏃‍♂️ Consistency beats intensity - regular workouts > occasional extremes!"
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        await ctx.reply(randomTip);
      });

      // Chat command - using i18next
      bot.command("chat", async (ctx) => {
        const userId = ctx.from.id;
        const userData = userStates.get(userId)?.data;
        
        if (!userData || !userData.name) {
          await ctx.reply("Please set up your profile first with /start for personalized chat!");
          return;
        }
        
        const userMessage = ctx.message?.text?.replace('/chat', '').trim();
        if (!userMessage) {
          await ctx.reply("What would you like to discuss about fitness, workouts, or nutrition?");
          return;
        }
        
        await ctx.reply(i18next.t('processing'));
        const response = await callOpenAI(userMessage, userData);
        await ctx.reply(response);
      });

      // Ask command - new feature
      bot.command("ask", async (ctx) => {
        const userId = ctx.from.id;
        const userData = userStates.get(userId)?.data;
        
        const userMessage = ctx.message?.text?.replace('/ask', '').trim();
        if (!userMessage) {
          await ctx.reply("What fitness question would you like to ask?");
          return;
        }
        
        await ctx.reply(i18next.t('processing'));
        const response = await callOpenAI(userMessage, userData);
        await ctx.reply(response);
      });

      // Main message handler with conversation flow
      bot.on("message", async (ctx) => {
        const userId = ctx.from.id;
        const messageText = ctx.message.text;
        const lowerText = messageText.toLowerCase().trim();
        
        // Skip if it's a command
        if (messageText.startsWith('/')) {
          return;
        }
        
        // Get current user state
        const userState = userStates.get(userId);
        const currentState = userState?.state || CONVERSATION_STATE.START;
        const userData = userState?.data || {};
        
        // Update timestamp
        if (userState) {
          userState.timestamp = Date.now();
          userStates.set(userId, userState);
        }
        
        // Check for quick responses first
        if (QUICK_RESPONSES[lowerText]) {
          await ctx.reply(QUICK_RESPONSES[lowerText]);
          return;
        }
        
        // Handle conversation flow
        switch (currentState) {
          case CONVERSATION_STATE.ASKING_NAME:
            userData.name = messageText;
            userState.data = userData;
            userState.state = CONVERSATION_STATE.ASKING_AGE;
            userStates.set(userId, userState);
            
            await ctx.reply(`Nice to meet you, ${messageText}! 👋\n\n${QUESTIONS.age}`);
            break;
            
          case CONVERSATION_STATE.ASKING_AGE:
            const age = parseInt(messageText);
            if (isNaN(age) || age < 10 || age > 100) {
              await ctx.reply("Please enter a valid age between 10 and 100:");
              return;
            }
            
            userData.age = age;
            userState.data = userData;
            userState.state = CONVERSATION_STATE.ASKING_WEIGHT;
            userStates.set(userId, userState);
            
            await ctx.reply(`Got it! ${QUESTIONS.weight}`);
            break;
            
          case CONVERSATION_STATE.ASKING_WEIGHT:
            const weight = parseFloat(messageText);
            if (isNaN(weight) || weight < 20 || weight > 300) {
              await ctx.reply("Please enter a valid weight in kg (20-300):");
              return;
            }
            
            userData.weight = weight;
            userState.data = userData;
            userState.state = CONVERSATION_STATE.ASKING_HEIGHT;
            userStates.set(userId, userState);
            
            await ctx.reply(`Great! ${QUESTIONS.height}`);
            break;
            
          case CONVERSATION_STATE.ASKING_HEIGHT:
            const height = parseInt(messageText);
            if (isNaN(height) || height < 100 || height > 250) {
              await ctx.reply("Please enter a valid height in cm (100-250):");
              return;
            }
            
            userData.height = height;
            userState.data = userData;
            userState.state = CONVERSATION_STATE.ASKING_GOALS;
            userStates.set(userId, userState);
            
            await ctx.reply(QUESTIONS.goals);
            break;
            
          case CONVERSATION_STATE.ASKING_GOALS:
            userData.goals = messageText;
            userState.data = userData;
            userState.state = CONVERSATION_STATE.READY;
            userStates.set(userId, userState);
            
            await ctx.reply(getProfileSummary(userData), { parse_mode: "Markdown" });
            
            await ctx.reply(`✅ *Profile Complete!*

Now I can provide personalized fitness advice! Here's what you can do:

1. Ask me anything about fitness
2. Use /workout for exercise plans
3. Use /nutrition for diet advice
4. Use /plan for weekly schedule
5. Or just chat with me!

What would you like to focus on first?`, { parse_mode: "Markdown" });
            break;
            
          case CONVERSATION_STATE.READY:
          case CONVERSATION_STATE.IN_CHAT:
            // Update to chat state if not already
            if (currentState === CONVERSATION_STATE.READY) {
              userState.state = CONVERSATION_STATE.IN_CHAT;
              userStates.set(userId, userState);
            }
            
            // Show processing message
            await ctx.reply(i18next.t('processing'));
            
            // Call OpenAI with user context
            try {
              const response = await callOpenAI(messageText, userData);
              await ctx.reply(response);
            } catch (error) {
              console.error("OpenAI error:", error);
              const fallback = generateFallbackResponse(userData, messageText);
              await ctx.reply(fallback);
            }
            break;
            
          default:
            // User not in conversation, guide them to start
            await ctx.reply(`${i18next.t('welcome')} Use /start to set up your profile and get personalized fitness advice! 💪`);
            break;
        }
      });

      // Error handling
      bot.catch((err) => {
        console.error("Bot error:", err);
      });

      // Handle webhook
      return await webhookCallback(bot, "cloudflare-mod")(request);

    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: i18next.t('error') }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
