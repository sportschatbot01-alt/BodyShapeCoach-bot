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
    ASKING_GENDER: 'asking_gender',
    ASKING_WEIGHT: 'asking_weight',
    ASKING_HEIGHT: 'asking_height',
    ASKING_GOALS: 'asking_goals',
    ASKING_ACTIVITY_LEVEL: 'asking_activity_level',
    ASKING_DIETARY_PREFS: 'asking_dietary_prefs',
    READY: 'ready',
    IN_CHAT: 'in_chat'
};

// LOCAL RESPONSE DATABASE
const LOCAL_RESPONSES = {
    workoutPlans: {
        'weight loss': `🔥 *Weight Loss Workout Plan* (3-4 times/week):
🏃‍♀️ *Cardio Focus:*
• 30 mins brisk walking/jogging
• 20 mins HIIT (30s sprint, 30s rest)
• 15 mins jump rope intervals
💪 *Strength Training:*
• Bodyweight squats: 3x15 reps
• Push-ups (or knee push-ups): 3x12 reps
• Plank: 3x45 seconds
• Lunges: 3x12 each leg
• Mountain climbers: 3x30 seconds
📅 *Weekly Schedule:*
Mon: Full body strength
Tue: Cardio HIIT
Wed: Active recovery (walking)
Thu: Full body strength
Fri: Cardio steady state
Sat: Rest
Sun: Light stretching
💡 *Tips:* Stay consistent, track calories, drink 3L water daily!`,
        'muscle gain': `💪 *Muscle Gain Workout Plan* (4-5 times/week):
🏋️‍♂️ *Strength Focus:*
• Squats: 4x8-10 reps (heavy)
• Bench press: 4x8-10 reps
• Deadlifts: 3x6-8 reps
• Shoulder press: 3x10 reps
• Pull-ups/Lat pulldowns: 4x8-10 reps
• Bicep curls: 3x12 reps
• Tricep extensions: 3x12 reps
📅 *Weekly Schedule:*
Mon: Chest & Triceps
Tue: Back & Biceps
Wed: Legs & Shoulders
Thu: Rest
Fri: Upper body
Sat: Lower body
Sun: Rest
🍗 *Nutrition:* Eat 300-500 calorie surplus, 2g protein per kg body weight!`,
        'toning & definition': `🔥 *Toning & Definition Plan* (5-6 times/week):
🎯 *Circuit Training:*
• Circuit 1 (repeat 3x):
  - Dumbbell thrusters: 12 reps
  - Renegade rows: 10 each side
  - Russian twists: 20 reps
  - Glute bridges: 15 reps
• Circuit 2 (repeat 3x):
  - Burpees: 10 reps
  - Plank to push-up: 12 reps
  - Side planks: 30s each side
  - Jumping lunges: 20 reps
📅 *Weekly Schedule:* Alternate circuits daily with 1 rest day
💦 *Key:* High reps (12-15), moderate weight, minimal rest between sets!`,
        'general fitness': `🌟 *General Fitness Plan* (3-4 times/week):
🏃‍♂️ *Balanced Routine:*
• Warm-up: 10 mins dynamic stretching
• Strength: Choose 5-6 exercises (squats, push-ups, rows, planks)
• Cardio: 20-30 mins (choice of running, cycling, swimming)
• Cool-down: 10 mins static stretching
📊 *Progressive Overload:*
Week 1: Learn form, light weights
Week 2: Increase 10% weight
Week 3: Add 1 extra set
Week 4: Active recovery week
🎯 *Focus:* Consistency over intensity! Start with what you can maintain.`
    },
    nutritionPlans: {
        'weight loss': `🥗 *Weight Loss Nutrition Plan*
📊 *Daily Targets:*
• Calories: Maintain 300-500 deficit
• Protein: 1.6-2g per kg body weight
• Carbs: 2-3g per kg body weight
• Fats: 0.8-1g per kg body weight
🍽️ *Sample Day:*
• Breakfast: Greek yogurt + berries + almonds
• Lunch: Grilled chicken + quinoa + mixed veggies
• Snack: Apple + peanut butter
• Dinner: Baked salmon + sweet potato + broccoli
• Hydration: 3-4L water
🚫 *Avoid:* Sugary drinks, processed snacks, fried foods`,
        'muscle gain': `🍗 *Muscle Gain Nutrition Plan*
📊 *Daily Targets:*
• Calories: 300-500 surplus
• Protein: 2-2.5g per kg body weight
• Carbs: 4-6g per kg body weight
• Fats: 0.8-1g per kg body weight
🍽️ *Sample Day:*
• Meal 1: 4 eggs + oatmeal + fruit
• Meal 2: Chicken breast + rice + greens
• Meal 3: Protein shake + banana
• Meal 4: Beef + potatoes + mixed veggies
• Meal 5: Cottage cheese + nuts
• Meal 6: Casein protein before bed
⚡ *Timing:* Eat every 3-4 hours, protein with every meal`,
        'general health': `🥦 *General Health Nutrition Plan*
🎯 *Principles:*
• Eat whole, unprocessed foods
• Include colorful vegetables (5+ servings)
• Choose lean proteins
• Healthy fats (avocado, nuts, olive oil)
• Complex carbs (oats, quinoa, sweet potato)
🍽️ *Plate Method:*
• ½ plate vegetables
• ¼ plate protein
• ¼ plate complex carbs
• Add healthy fats
💧 *Hydration:* 8-10 glasses water daily
⏰ *Timing:* Listen to hunger cues, avoid late night eating`
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
    quickResponses: {
        'hello': "Hello! How can I assist you with your fitness journey today?",
        'hi': "Hi there! Ready to work on your fitness goals?",
        'hey': "Hey! How's your fitness journey going?",
        'thanks': i18next.t('thanks'),
        'thank you': i18next.t('thanks'),
        'thank': i18next.t('thanks'),
        'how are you': "I'm great! Ready to help you achieve your fitness goals! 💪"
    }
};

// Questions flow
const QUESTIONS = {
    name: "What's your name?",
    age: "How old are you? (e.g., 25)",
    gender: "What's your gender? (Male/Female/Other)",
    weight: "What's your current weight in kg? (e.g., 75)",
    height: "What's your height in cm? (e.g., 175)",
    goals: "What are your fitness goals? (Weight loss, Muscle gain, Toning, Strength, General fitness, Endurance)",
    activityLevel: "What's your activity level? (Sedentary, Light, Moderate, Active, Very Active)",
    dietaryPrefs: "Do you have any dietary preferences or restrictions? (Vegetarian, Vegan, Keto, Allergies, etc.)"
};

// Helpers
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
    return `📅 *Weekly Fitness Plan for ${userData.name}*
🎯 *Based on your goal: ${userData.goals}*

Mon: Strength & Cardio
Tue: HIIT / Core
Wed: Active recovery / Stretching
Thu: Upper body strength
Fri: Cardio + Core
Sat: Fun activity (swimming, hiking)
Sun: Rest & plan next week

💡 Tips: Adjust based on energy levels, stay hydrated, sleep well!`;
};

const getProfileSummary = (userData) => {
    const bmi = (userData.weight / ((userData.height / 100) ** 2)).toFixed(1);
    const dailyCalories = Math.round(userData.weight * 30);
    const proteinTarget = Math.round(userData.weight * 1.6);

    let bmiCategory = "Healthy";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi >= 25 && bmi < 30) bmiCategory = "Overweight";
    else if (bmi >= 30) bmiCategory = "Obese";

    return `📋 *Your Profile Summary:*
👤 Name: ${userData.name}
• Age: ${userData.age}
• Gender: ${userData.gender}
• Height: ${userData.height} cm
• Weight: ${userData.weight} kg
• BMI: ${bmi} (${bmiCategory})
🎯 Goals: ${userData.goals}
📊 Daily: ~${dailyCalories} kcal, Protein: ${proteinTarget}g
• Water: 3-4 L
• Sleep: 7-9 hrs
💪 Ready to achieve your goals! Use /workout or /nutrition to begin!`;
};

// Main Worker
export default {
    async fetch(request, env, ctx) {
        try {
            const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

            // Cleanup old states
            const cleanupOldStates = () => {
                const now = Date.now();
                const oneDayAgo = now - (24 * 60 * 60 * 1000);
                for (const [userId, data] of userStates.entries()) {
                    if (data.timestamp && data.timestamp < oneDayAgo) userStates.delete(userId);
                }
            };
            cleanupOldStates();

            // START command
            bot.command("start", async (ctx) => {
                const userId = ctx.from.id;
                userStates.set(userId, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                await ctx.reply(i18next.t('welcome'), { parse_mode: "Markdown" });
                await ctx.reply(QUESTIONS.name);
            });

            // PROFILE command
            bot.command("profile", async (ctx) => {
                const userId = ctx.from.id;
                const userData = userStates.get(userId)?.data;
                if (userData && userData.name) await ctx.reply(getProfileSummary(userData), { parse_mode: "Markdown" });
                else await ctx.reply("You haven't set up your profile yet. Use /start!");
            });

            // UPDATE command
            bot.command("update", async (ctx) => {
                const userId = ctx.from.id;
                userStates.set(userId, { state: CONVERSATION_STATE.ASKING_NAME, data: {}, timestamp: Date.now() });
                await ctx.reply("Let's update your profile! " + QUESTIONS.name);
            });

            // HELP command
            bot.command("help", async (ctx) => {
                await ctx.reply(i18next.t('help'), { parse_mode: "Markdown" });
            });

            // WORKOUT command
            bot.command("workout", async (ctx) => {
                const userData = userStates.get(ctx.from.id)?.data;
                if (!userData?.name) return ctx.reply("Please set up your profile first with /start!");
                await ctx.reply(i18next.t('processing'));
                await ctx.reply(getLocalWorkoutPlan(userData.goals), { parse_mode: "Markdown" });
            });

            // NUTRITION command
            bot.command("nutrition", async (ctx) => {
                const userData = userStates.get(ctx.from.id)?.data;
                if (!userData?.name) return ctx.reply("Please set up your profile first with /start!");
                await ctx.reply(i18next.t('processing'));
                await ctx.reply(getLocalNutritionPlan(userData.goals), { parse_mode: "Markdown" });
            });

            // PLAN command
            bot.command("plan", async (ctx) => {
                const userData = userStates.get(ctx.from.id)?.data;
                if (!userData?.name) return ctx.reply("Please set up your profile first with /start!");
                await ctx.reply(i18next.t('processing'));
                await ctx.reply(generateWeeklyPlan(userData), { parse_mode: "Markdown" });
            });

            // TIP command
            bot.command("tip", async (ctx) => {
                const randomTip = LOCAL_RESPONSES.tips[Math.floor(Math.random() * LOCAL_RESPONSES.tips.length)];
                await ctx.reply(randomTip);
            });

            // CHAT command
            bot.command("chat", async (ctx) => {
                const userData = userStates.get(ctx.from.id)?.data;
                if (!userData?.name) return ctx.reply("Please set up your profile first with /start!");
                const userMessage = ctx.message?.text?.replace('/chat', '').trim();
                if (!userMessage) return ctx.reply("What would you like to discuss about fitness, workouts, or nutrition?");
                await ctx.reply(i18next.t('processing'));

                // OpenAI integration
                if (env.OPENAI_API_KEY) {
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
                                    { role: "system", content: `You are a fitness coach for ${userData.name} (${userData.age}y, ${userData.height}cm, ${userData.weight}kg) with goal: ${userData.goals}.` },
                                    { role: "user", content: userMessage }
                                ],
                                max_tokens: 400
                            })
                        });
                        if (response.ok) {
                            const data = await response.json();
                            return ctx.reply(data.choices[0]?.message?.content || "Got it! Keep up the good work! 💪");
                        }
                    } catch { }
                }

                // Fallback response
                const fallbackResponses = [
                    `For your goal "${userData.goals}", consistency is key! Focus on workouts and balanced nutrition. 💪`,
                    `Remember: progress takes time! Celebrate small victories. 🎉`,
                    `Start with basic exercises and gradually increase intensity. 🏋️‍♂️`
                ];
                await ctx.reply(fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]);
            });

            // Main message handler
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
                        await ctx.reply(`Nice to meet you, ${messageText}! 👋\n\n${QUESTIONS.age}`);
                        break;

                    case CONVERSATION_STATE.ASKING_AGE:
                        const age = parseInt(messageText);
                        if (isNaN(age) || age < 10 || age >
