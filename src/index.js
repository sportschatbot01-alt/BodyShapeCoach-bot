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
                help: "🤖 *Available Commands:*\n\n/start - Start/restart profile setup\n/profile - View your profile\n/update - Update profile\n/workout - Get workout plan\n/nutrition - Get nutrition advice\n/plan - Weekly fitness plan\n/tip - Random fitness tip\n/help - Show this help",
                processing: "⏳ Processing your request...",
                error: "❌ Sorry, I encountered an error. Please try again later.",
                thanks: "🙏 Thank you for using Body Shape Coach!"
            }
        }
    }
});

// In-memory storage for user states
const userStates = new Map();

// Conversation states
const CONVERSATION_STATE = {
    START: 'start',
    ASKING_NAME: 'asking_name',
    ASKING_AGE: 'asking_age',
    ASKING_WEIGHT: 'asking_weight',
    ASKING_HEIGHT: 'asking_height',
    ASKING_GOALS: 'asking_goals',
    READY: 'ready'
};

// Local responses database
const LOCAL_RESPONSES = {
    workoutPlans: {
        'weight loss': `🔥 *Weight Loss Workout Plan* (3-4 times/week):\n• Cardio + Strength ...`,
        'muscle gain': `💪 *Muscle Gain Workout Plan* (4-5 times/week):\n• Strength Focus ...`,
        'toning & definition': `🔥 *Toning & Definition Plan* (5-6 times/week):\n• Circuit Training ...`,
        'general fitness': `🌟 *General Fitness Plan* (3-4 times/week):\n• Balanced Routine ...`
    },
    nutritionPlans: {
        'weight loss': `🥗 *Weight Loss Nutrition Plan*\n• Calories: 300-500 deficit ...`,
        'muscle gain': `🍗 *Muscle Gain Nutrition Plan*\n• Calories: 300-500 surplus ...`,
        'general health': `🥦 *General Health Nutrition Plan*\n• Eat whole, unprocessed foods ...`
    },
    tips: [
        "💧 Drink water first thing in the morning to kickstart metabolism!",
        "🏋️‍♂️ Focus on form over weight!",
        "🥗 Include protein in every meal!",
        "😴 Get 7-9 hours of sleep!",
        "📱 Track your workouts!",
        "🔥 HIIT workouts burn more calories!",
        "🧘‍♂️ Don't skip stretching!",
        "🥑 Healthy fats are essential!",
        "💪 Progressive overload!",
        "🏃‍♂️ Consistency beats intensity!"
    ],
    quickResponses: {
        'hello': "Hello! How can I assist you with your fitness journey today?",
        'hi': "Hi there! Ready to work on your fitness goals?",
        'hey': "Hey! How's your fitness journey going?",
        'thanks': i18next.t('thanks'),
        'thank you': i18next.t('thanks'),
        'how are you': "I'm great! Ready to help you achieve your fitness goals! 💪"
    }
};

// Profile setup questions
const QUESTIONS = {
    name: "What's your name?",
    age: "How old are you? (e.g., 25)",
    weight: "What's your current weight in kg? (e.g., 75)",
    height: "What's your height in cm? (e.g., 175)",
    goals: `What are your fitness goals? Choose or describe:
• 🏃 Weight loss
• 💪 Muscle gain
• 🔥 Toning & definition
• 🏋️‍♂️ Strength building
• 🧘‍♂️ General fitness
• 📈 Endurance improvement`
};

// Helper functions
const getWorkoutPlan = (goal) => {
    const g = goal.toLowerCase();
    if (g.includes('loss')) return LOCAL_RESPONSES.workoutPlans['weight loss'];
    if (g.includes('gain')) return LOCAL_RESPONSES.workoutPlans['muscle gain'];
    if (g.includes('ton') || g.includes('definition')) return LOCAL_RESPONSES.workoutPlans['toning & definition'];
    return LOCAL_RESPONSES.workoutPlans['general fitness'];
};

const getNutritionPlan = (goal) => {
    const g = goal.toLowerCase();
    if (g.includes('loss')) return LOCAL_RESPONSES.nutritionPlans['weight loss'];
    if (g.includes('gain')) return LOCAL_RESPONSES.nutritionPlans['muscle gain'];
    return LOCAL_RESPONSES.nutritionPlans['general health'];
};

const getProfileSummary = (userData) => {
    const bmi = (userData.weight / ((userData.height / 100) ** 2)).toFixed(1);
    let bmiCategory = "Healthy";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi >= 25 && bmi < 30) bmiCategory = "Overweight";
    else if (bmi >= 30) bmiCategory = "Obese";
    const calories = Math.round(userData.weight * 30);
    const protein = Math.round(userData.weight * 1.6);

    return `📋 *Profile Summary:*
👤 Name: ${userData.name}
• Age: ${userData.age}
• Height: ${userData.height} cm
• Weight: ${userData.weight} kg
• BMI: ${bmi} (${bmiCategory})
🎯 Goals: ${userData.goals}
📊 Daily Recommendations:
• Calories: ~${calories} kcal
• Protein: ${protein}g
• Water: 3-4 liters
• Sleep: 7-9 hours
💪 Ready to achieve your goals!`;
};

const generateWeeklyPlan = (userData) => {
    return `📅 *Weekly Plan for ${userData.name}* based on goal: ${userData.goals}\n• Mon: Strength\n• Tue: Cardio\n• Wed: Active Recovery\n• Thu: Strength\n• Fri: Cardio + Core\n• Sat: Fun Activity\n• Sun: Rest`;
};

// Cloudflare Worker
export default {
    async fetch(request, env, ctx) {
        try {
            // Only POST for Telegram webhook
            if (request.method !== "POST") {
                return new Response("Bot is running!", { status: 200 });
            }

            const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

            // Start command
            bot.command("start", async (ctx) => {
                const id = ctx.from.id;
                userStates.set(id, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                await ctx.reply(i18next.t('welcome'), { parse_mode: "Markdown" });
                await ctx.reply(QUESTIONS.name);
            });

            // Profile
            bot.command("profile", async (ctx) => {
                const id = ctx.from.id;
                const userData = userStates.get(id)?.data;
                if (userData?.name) await ctx.reply(getProfileSummary(userData), { parse_mode: "Markdown" });
                else await ctx.reply("Profile not set. Use /start to begin.");
            });

            // Update
            bot.command("update", async (ctx) => {
                const id = ctx.from.id;
                userStates.set(id, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                await ctx.reply("Let's update your profile! " + QUESTIONS.name);
            });

            // Help
            bot.command("help", async (ctx) => {
                await ctx.reply(i18next.t('help'), { parse_mode: "Markdown" });
            });

            // Workout
            bot.command("workout", async (ctx) => {
                const id = ctx.from.id;
                const userData = userStates.get(id)?.data;
                if (!userData?.name) return ctx.reply("Set up profile first (/start)!");
                await ctx.reply(i18next.t('processing'));
                await ctx.reply(getWorkoutPlan(userData.goals), { parse_mode: "Markdown" });
            });

            // Nutrition
            bot.command("nutrition", async (ctx) => {
                const id = ctx.from.id;
                const userData = userStates.get(id)?.data;
                if (!userData?.name) return ctx.reply("Set up profile first (/start)!");
                await ctx.reply(i18next.t('processing'));
                await ctx.reply(getNutritionPlan(userData.goals), { parse_mode: "Markdown" });
            });

            // Weekly Plan
            bot.command("plan", async (ctx) => {
                const id = ctx.from.id;
                const userData = userStates.get(id)?.data;
                if (!userData?.name) return ctx.reply("Set up profile first (/start)!");
                await ctx.reply(generateWeeklyPlan(userData), { parse_mode: "Markdown" });
            });

            // Tip
            bot.command("tip", async (ctx) => {
                const tip = LOCAL_RESPONSES.tips[Math.floor(Math.random() * LOCAL_RESPONSES.tips.length)];
                await ctx.reply(tip);
            });

            // Main message handler
            bot.on("message", async (ctx) => {
                const id = ctx.from.id;
                const text = ctx.message.text?.trim();
                if (!text || text.startsWith('/')) return;

                let state = userStates.get(id);
                if (!state) {
                    userStates.set(id, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                    state = userStates.get(id);
                }
                const data = state.data || {};
                state.timestamp = Date.now();

                const lower = text.toLowerCase();
                if (LOCAL_RESPONSES.quickResponses[lower]) return ctx.reply(LOCAL_RESPONSES.quickResponses[lower]);

                switch (state.state) {
                    case CONVERSATION_STATE.ASKING_NAME:
                        data.name = text;
                        state.state = CONVERSATION_STATE.ASKING_AGE;
                        await ctx.reply(`Nice to meet you, ${text}!\n${QUESTIONS.age}`);
                        break;
                    case CONVERSATION_STATE.ASKING_AGE:
                        const age = parseInt(text);
                        if (isNaN(age) || age < 10 || age > 100) return ctx.reply("Enter a valid age (10-100):");
                        data.age = age;
                        state.state = CONVERSATION_STATE.ASKING_WEIGHT;
                        await ctx.reply(QUESTIONS.weight);
                        break;
                    case CONVERSATION_STATE.ASKING_WEIGHT:
                        const weight = parseFloat(text);
                        if (isNaN(weight) || weight < 20 || weight > 300) return ctx.reply("Enter weight (20-300kg):");
                        data.weight = weight;
                        state.state = CONVERSATION_STATE.ASKING_HEIGHT;
                        await ctx.reply(QUESTIONS.height);
                        break;
                    case CONVERSATION_STATE.ASKING_HEIGHT:
                        const height = parseInt(text);
                        if (isNaN(height) || height < 100 || height > 250) return ctx.reply("Enter height (100-250cm):");
                        data.height = height;
                        state.state = CONVERSATION_STATE.ASKING_GOALS;
                        await ctx.reply(QUESTIONS.goals);
                        break;
                    case CONVERSATION_STATE.ASKING_GOALS:
                        data.goals = text;
                        state.state = CONVERSATION_STATE.READY;
                        await ctx.reply(getProfileSummary(data), { parse_mode: "Markdown" });
                        await ctx.reply(`✅ Profile Complete! Use /workout, /nutrition, /plan, /tip or chat with me!`, { parse_mode: "Markdown" });
                        break;
                    case CONVERSATION_STATE.READY:
                        await ctx.reply(`Use /workout, /nutrition, /plan, /tip or ask questions about your fitness goals! 💪`);
                        break;
                }

                userStates.set(id, state);
            });

            bot.catch((err) => console.error("Bot error:", err));

            return await webhookCallback(bot, "cloudflare-mod")(request);

        } catch (error) {
            console.error("Worker error:", error);
            return new Response(JSON.stringify({ error: i18next.t('error') }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    }
};
