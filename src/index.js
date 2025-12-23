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

// Questions for profile setup
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

// Local response database
const LOCAL_RESPONSES = {
    quickResponses: {
        'hello': "Hello! How can I assist you with your fitness journey today?",
        'hi': "Hi there! Ready to work on your fitness goals?",
        'hey': "Hey! How's your fitness journey going?",
        'thanks': i18next.t('thanks'),
        'thank you': i18next.t('thanks'),
        'thank': i18next.t('thanks'),
        'how are you': "I'm great! Ready to help you achieve your fitness goals! 💪"
    },
    tips: [
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
    ],
    workoutPlans: {
        'weight loss': `🔥 *Weight Loss Workout Plan* ...`,
        'muscle gain': `💪 *Muscle Gain Workout Plan* ...`,
        'toning & definition': `🔥 *Toning & Definition Plan* ...`,
        'general fitness': `🌟 *General Fitness Plan* ...`
    },
    nutritionPlans: {
        'weight loss': `🥗 *Weight Loss Nutrition Plan* ...`,
        'muscle gain': `🍗 *Muscle Gain Nutrition Plan* ...`,
        'general health': `🥦 *General Health Nutrition Plan* ...`
    }
};

// Helper functions
const getLocalWorkoutPlan = (goal) => {
    const g = goal.toLowerCase();
    if (g.includes('loss')) return LOCAL_RESPONSES.workoutPlans['weight loss'];
    if (g.includes('gain')) return LOCAL_RESPONSES.workoutPlans['muscle gain'];
    if (g.includes('ton') || g.includes('definition')) return LOCAL_RESPONSES.workoutPlans['toning & definition'];
    return LOCAL_RESPONSES.workoutPlans['general fitness'];
};

const getLocalNutritionPlan = (goal) => {
    const g = goal.toLowerCase();
    if (g.includes('loss')) return LOCAL_RESPONSES.nutritionPlans['weight loss'];
    if (g.includes('gain')) return LOCAL_RESPONSES.nutritionPlans['muscle gain'];
    return LOCAL_RESPONSES.nutritionPlans['general health'];
};

const generateWeeklyPlan = (userData) => {
    return `📅 *Weekly Fitness Plan for ${userData.name}*\n...`; // simplified for brevity
};

const getProfileSummary = (userData) => {
    const bmi = (userData.weight / ((userData.height / 100) ** 2)).toFixed(1);
    const dailyCalories = Math.round(userData.weight * 30);
    const proteinTarget = Math.round(userData.weight * 1.6);
    let bmiCategory = "Healthy";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi >= 25) bmiCategory = "Overweight";
    else if (bmi >= 30) bmiCategory = "Obese";
    return `📋 *Your Profile Summary:*\n👤 Name: ${userData.name}\nAge: ${userData.age}\nHeight: ${userData.height}cm\nWeight: ${userData.weight}kg\nBMI: ${bmi} (${bmiCategory})\n🎯 Goals: ${userData.goals}\n📊 Calories: ~${dailyCalories} kcal\nProtein: ${proteinTarget}g daily`;
};

export default {
    async fetch(request, env, ctx) {
        try {
            if (request.method !== "POST") {
                return new Response("Bot is running!", { status: 200 });
            }

            const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

            // Clean old user states
            const cleanupOldStates = () => {
                const now = Date.now();
                const oneDayAgo = now - (24 * 60 * 60 * 1000);
                for (const [uid, data] of userStates.entries()) {
                    if (data.timestamp < oneDayAgo) userStates.delete(uid);
                }
            };
            cleanupOldStates();

            // Start command
            bot.command("start", async (ctx) => {
                const uid = ctx.from.id;
                userStates.set(uid, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                await ctx.reply(i18next.t('welcome'), { parse_mode: "Markdown" });
                await ctx.reply(QUESTIONS.name);
            });

            // Profile command
            bot.command("profile", async (ctx) => {
                const uid = ctx.from.id;
                const userData = userStates.get(uid)?.data;
                if (!userData?.name) {
                    await ctx.reply("Profile not set. Use /start to begin!");
                    return;
                }
                await ctx.reply(getProfileSummary(userData), { parse_mode: "Markdown" });
            });

            // Workout
            bot.command("workout", async (ctx) => {
                const uid = ctx.from.id;
                const userData = userStates.get(uid)?.data;
                if (!userData?.name) { await ctx.reply("Set profile first with /start"); return; }
                await ctx.reply(getLocalWorkoutPlan(userData.goals), { parse_mode: "Markdown" });
            });

            // Nutrition
            bot.command("nutrition", async (ctx) => {
                const uid = ctx.from.id;
                const userData = userStates.get(uid)?.data;
                if (!userData?.name) { await ctx.reply("Set profile first with /start"); return; }
                await ctx.reply(getLocalNutritionPlan(userData.goals), { parse_mode: "Markdown" });
            });

            // Plan
            bot.command("plan", async (ctx) => {
                const uid = ctx.from.id;
                const userData = userStates.get(uid)?.data;
                if (!userData?.name) { await ctx.reply("Set profile first with /start"); return; }
                await ctx.reply(generateWeeklyPlan(userData), { parse_mode: "Markdown" });
            });

            // Tip
            bot.command("tip", async (ctx) => {
                const tip = LOCAL_RESPONSES.tips[Math.floor(Math.random() * LOCAL_RESPONSES.tips.length)];
                await ctx.reply(tip);
            });

            // Chat fallback
            bot.command("chat", async (ctx) => {
                const uid = ctx.from.id;
                const userData = userStates.get(uid)?.data;
                if (!userData?.name) { await ctx.reply("Set profile first with /start"); return; }
                const msg = ctx.message.text?.replace("/chat", "").trim();
                if (!msg) { await ctx.reply("What would you like to discuss?"); return; }

                // Fallback responses
                const fallbackResponses = [
                    `For your goal "${userData.goals}", consistency is key! Focus on workouts and balanced nutrition. 💪`,
                    `Remember: progress takes time! Celebrate small victories. 🎉`,
                    `Start with basic exercises and gradually increase intensity. 🏋️‍♂️`
                ];
                await ctx.reply(fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]);
            });

            // Main message handler
            bot.on("message", async (ctx) => {
                const uid = ctx.from.id;
                const text = ctx.message.text?.trim();
                if (!text || text.startsWith("/")) return;

                let state = userStates.get(uid);
                if (!state) {
                    userStates.set(uid, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                    state = userStates.get(uid);
                }
                const data = state.data || {};
                state.timestamp = Date.now();

                const lower = text.toLowerCase();
                if (LOCAL_RESPONSES.quickResponses[lower]) { await ctx.reply(LOCAL_RESPONSES.quickResponses[lower]); return; }

                switch (state.state) {
                    case CONVERSATION_STATE.ASKING_NAME:
                        data.name = text;
                        state.state = CONVERSATION_STATE.ASKING_AGE;
                        await ctx.reply(`Nice to meet you, ${text}! 👋\n\n${QUESTIONS.age}`);
                        break;

                    case CONVERSATION_STATE.ASKING_AGE:
                        const age = parseInt(text);
                        if (isNaN(age) || age < 10 || age > 100) {
                            await ctx.reply("Enter a valid age (10-100):"); return;
                        }
                        data.age = age;
                        state.state = CONVERSATION_STATE.ASKING_WEIGHT;
                        await ctx.reply(QUESTIONS.weight);
                        break;

                    case CONVERSATION_STATE.ASKING_WEIGHT:
                        const weight = parseFloat(text);
                        if (isNaN(weight) || weight < 20 || weight > 300) { await ctx.reply("Enter valid weight (20-300 kg):"); return; }
                        data.weight = weight;
                        state.state = CONVERSATION_STATE.ASKING_HEIGHT;
                        await ctx.reply(QUESTIONS.height);
                        break;

                    case CONVERSATION_STATE.ASKING_HEIGHT:
                        const height = parseInt(text);
                        if (isNaN(height) || height < 100 || height > 250) { await ctx.reply("Enter valid height (100-250 cm):"); return; }
                        data.height = height;
                        state.state = CONVERSATION_STATE.ASKING_GOALS;
                        await ctx.reply(QUESTIONS.goals);
                        break;

                    case CONVERSATION_STATE.ASKING_GOALS:
                        data.goals = text;
                        state.state = CONVERSATION_STATE.READY;
                        await ctx.reply(getProfileSummary(data), { parse_mode: "Markdown" });
                        await ctx.reply(`✅ *Profile Complete!*\nNow you can use /workout, /nutrition, /plan, /tip, or just chat!`, { parse_mode: "Markdown" });
                        break;

                    case CONVERSATION_STATE.READY:
                        await ctx.reply(`Use /workout, /nutrition, /plan, /tip, or just ask me anything about your fitness goals! 💪`);
                        break;

                    default:
                        await ctx.reply(i18next.t('welcome'), { parse_mode: "Markdown" });
                }

                userStates.set(uid, state);
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
