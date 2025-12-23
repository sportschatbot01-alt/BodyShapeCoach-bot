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

// In-memory user storage
const userStates = new Map();

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

// Local responses (workout, nutrition, tips, quick replies)
const LOCAL_RESPONSES = {
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
    },
    tips: [
        "💧 Drink water first thing in the morning to kickstart metabolism!",
        "🏋️‍♂️ Focus on form over weight...",
        "🥗 Include protein in every meal...",
        "😴 Get 7-9 hours of sleep...",
        "🔥 HIIT workouts can burn more calories in less time!"
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

const getProfileSummary = (userData) => {
    const bmi = (userData.weight / ((userData.height / 100) ** 2)).toFixed(1);
    const dailyCalories = Math.round(userData.weight * 30);
    const proteinTarget = Math.round(userData.weight * 1.6);
    let bmiCategory = "Healthy";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi >= 25) bmiCategory = "Overweight";
    else if (bmi >= 30) bmiCategory = "Obese";

    return `📋 *Your Profile Summary:*
👤 Name: ${userData.name}
👤 Age: ${userData.age}
👤 Height: ${userData.height} cm
👤 Weight: ${userData.weight} kg
👤 BMI: ${bmi} (${bmiCategory})
🎯 Fitness Goals: ${userData.goals}
📊 Daily Recommendations: ~${dailyCalories} kcal, Protein: ${proteinTarget}g, Water: 3-4L, Sleep: 7-9h
💪 Ready to achieve your goals! Use /workout or /nutrition to begin!`;
};

// Create the bot instance outside fetch for Cloudflare
const bot = new Bot(() => {
    throw new Error("TELEGRAM_BOT_TOKEN missing");
});
bot.token = null; // Will be set in fetch via env

// Set up commands
bot.command("start", async (ctx) => {
    const userId = ctx.from.id;
    userStates.set(userId, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
    await ctx.reply(i18next.t('welcome'), { parse_mode: "Markdown" });
    await ctx.reply("Let's set up your profile!\n\n" + QUESTIONS.name);
});

bot.command("profile", async (ctx) => {
    const userId = ctx.from.id;
    const userData = userStates.get(userId)?.data;
    if (!userData?.name) return ctx.reply("Use /start to set up your profile first!");
    await ctx.reply(getProfileSummary(userData), { parse_mode: "Markdown" });
});

bot.command("update", async (ctx) => {
    const userId = ctx.from.id;
    userStates.set(userId, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
    await ctx.reply("Let's update your profile! What's your name?");
});

bot.command("help", async (ctx) => {
    await ctx.reply(i18next.t('help'), { parse_mode: "Markdown" });
});

bot.command("workout", async (ctx) => {
    const userId = ctx.from.id;
    const userData = userStates.get(userId)?.data;
    if (!userData?.name) return ctx.reply("Please set up your profile first with /start!");
    await ctx.reply(i18next.t('processing'));
    await ctx.reply(getLocalWorkoutPlan(userData.goals), { parse_mode: "Markdown" });
});

bot.command("nutrition", async (ctx) => {
    const userId = ctx.from.id;
    const userData = userStates.get(userId)?.data;
    if (!userData?.name) return ctx.reply("Please set up your profile first with /start!");
    await ctx.reply(i18next.t('processing'));
    await ctx.reply(getLocalNutritionPlan(userData.goals), { parse_mode: "Markdown" });
});

bot.command("tip", async (ctx) => {
    const tip = LOCAL_RESPONSES.tips[Math.floor(Math.random() * LOCAL_RESPONSES.tips.length)];
    await ctx.reply(tip);
});

// Conversation flow
bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    const messageText = ctx.message.text?.trim();
    if (!messageText || messageText.startsWith('/')) return;

    let userState = userStates.get(userId);
    if (!userState) {
        userStates.set(userId, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
        userState = userStates.get(userId);
    }
    const userData = userState.data || {};
    userState.timestamp = Date.now();

    const lowerText = messageText.toLowerCase();
    if (LOCAL_RESPONSES.quickResponses[lowerText]) return ctx.reply(LOCAL_RESPONSES.quickResponses[lowerText]);

    switch (userState.state) {
        case CONVERSATION_STATE.ASKING_NAME:
            userData.name = messageText;
            userState.state = CONVERSATION_STATE.ASKING_AGE;
            await ctx.reply(`Nice to meet you, ${messageText}!\n\n${QUESTIONS.age}`);
            break;
        case CONVERSATION_STATE.ASKING_AGE:
            const age = parseInt(messageText);
            if (isNaN(age) || age < 10 || age > 100) return ctx.reply("Enter a valid age (10-100):");
            userData.age = age;
            userState.state = CONVERSATION_STATE.ASKING_WEIGHT;
            await ctx.reply(QUESTIONS.weight);
            break;
        case CONVERSATION_STATE.ASKING_WEIGHT:
            const weight = parseFloat(messageText);
            if (isNaN(weight) || weight < 20 || weight > 300) return ctx.reply("Enter a valid weight (20-300 kg):");
            userData.weight = weight;
            userState.state = CONVERSATION_STATE.ASKING_HEIGHT;
            await ctx.reply(QUESTIONS.height);
            break;
        case CONVERSATION_STATE.ASKING_HEIGHT:
            const height = parseInt(messageText);
            if (isNaN(height) || height < 100 || height > 250) return ctx.reply("Enter a valid height (100-250 cm):");
            userData.height = height;
            userState.state = CONVERSATION_STATE.ASKING_GOALS;
            await ctx.reply(QUESTIONS.goals);
            break;
        case CONVERSATION_STATE.ASKING_
