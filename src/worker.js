import { Telegraf, session, Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import { I18n } from 'i18next';
import DatabaseService from './database/databaseService.js';
import OpenAIService from './services/openai.js';
import SubscriptionService from './services/subscription.js';
import NotificationService from './services/notifications.js';
import setupCommands from './bot/commands/index.js';
import setupHandlers from './bot/handlers/index.js';
import setupConversations from './bot/conversations/index.js';
import i18n from './utils/i18n.js';

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

class BodyShapeCoachBot {
    constructor() {
        if (!BOT_TOKEN) {
            throw new Error('BOT_TOKEN must be provided!');
        }
        
        this.bot = new Telegraf(BOT_TOKEN);
        this.db = new DatabaseService();
        this.openai = new OpenAIService(process.env.OPENAI_API_KEY);
        this.subscription = new SubscriptionService(this.db);
        this.notifications = new NotificationService(this.bot, this.db);
        
        this.setupMiddlewares();
        this.setupScenes();
        this.setupCommands();
        this.setupHandlers();
        this.setupErrorHandling();
    }
    
    setupMiddlewares() {
        // Session middleware for conversation state
        this.bot.use(session({
            defaultSession: () => ({
                scene: null,
                step: 0,
                data: {},
                userProfile: {},
                conversationStartTime: Date.now()
            })
        }));
        
        // Internationalization middleware
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id;
            if (userId) {
                const user = await this.db.getUser(userId);
                ctx.userLanguage = user?.language || 'en';
                ctx.t = i18n.getFixedT(ctx.userLanguage);
            } else {
                ctx.t = i18n.getFixedT('en');
            }
            await next();
        });
        
        // User registration middleware
        this.bot.use(async (ctx, next) => {
            if (!ctx.from) return next();
            
            const userId = ctx.from.id;
            let user = await this.db.getUser(userId);
            
            if (!user) {
                user = await this.db.createUser({
                    telegram_id: userId.toString(),
                    username: ctx.from.username,
                    first_name: ctx.from.first_name,
                    last_name: ctx.from.last_name,
                    language: ctx.from.language_code || 'en'
                });
            }
            
            ctx.user = user;
            await next();
        });
        
        // Subscription check middleware (skip for certain commands)
        this.bot.use(async (ctx, next) => {
            const exemptCommands = ['/start', '/help', '/language', '/subscribe', '/contact'];
            const exemptCallbackQueries = ['language_', 'subscribe_', 'help_'];
            
            const messageText = ctx.message?.text || '';
            const callbackData = ctx.callbackQuery?.data || '';
            
            // Check if exempt
            const isExempt = exemptCommands.some(cmd => messageText.startsWith(cmd)) ||
                            exemptCallbackQueries.some(prefix => callbackData.startsWith(prefix));
            
            if (isExempt) {
                return next();
            }
            
            // Check subscription
            const hasActiveSubscription = await this.subscription.checkActiveSubscription(ctx.user.id);
            
            if (!hasActiveSubscription) {
                await ctx.reply(ctx.t('subscription.expired'), {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: ctx.t('subscription.renew'), callback_data: 'subscribe_show_plans' }
                            ]
                        ]
                    }
                });
                return;
            }
            
            await next();
        });
    }
    
    setupScenes() {
        // Create conversation scenes
        const { createProfileWizard, updateProfileWizard } = setupConversations(this.db, this.openai);
        
        const stage = new Scenes.Stage([
            createProfileWizard,
            updateProfileWizard
        ]);
        
        this.bot.use(stage.middleware());
    }
    
    setupCommands() {
        const commands = setupCommands(this.db, this.openai, this.subscription);
        
        // Start command
        this.bot.command('start', commands.start);
        
        // Profile commands
        this.bot.command('profile', commands.profile);
        this.bot.command('update_profile', commands.updateProfile);
        
        // Plan commands
        this.bot.command('plan', commands.generatePlan);
        this.bot.command('today', commands.todayPlan);
        this.bot.command('log', commands.logFood);
        
        // Subscription commands
        this.bot.command('subscribe', commands.subscribe);
        this.bot.command('my_subscription', commands.mySubscription);
        
        // Language commands
        this.bot.command('language', commands.changeLanguage);
        this.bot.command('help', commands.help);
        
        // Admin commands
        this.bot.command('admin_stats', async (ctx) => {
            if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
                return ctx.reply(ctx.t('admin.unauthorized'));
            }
            await commands.adminStats(ctx, this.db);
        });
    }
    
    setupHandlers() {
        const handlers = setupHandlers(this.db, this.openai);
        
        // Photo handler for food analysis
        this.bot.on(message('photo'), handlers.handlePhoto);
        
        // Text message handler
        this.bot.on(message('text'), handlers.handleText);
        
        // Callback query handler
        this.bot.on('callback_query', handlers.handleCallback);
        
        // Location handler
        this.bot.on(message('location'), handlers.handleLocation);
    }
    
    setupErrorHandling() {
        this.bot.catch(async (err, ctx) => {
            console.error(`Error for ${ctx.updateType}:`, err);
            
            await ctx.reply(ctx.t('errors.general'), {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: ctx.t('menu.restart'), callback_data: 'restart_bot' }]
                    ]
                }
            });
            
            // Notify admin
            if (process.env.ADMIN_ID) {
                await this.bot.telegram.sendMessage(
                    process.env.ADMIN_ID,
                    `❌ Bot Error:\n\n` +
                    `User: @${ctx.from?.username || 'N/A'} (${ctx.from?.id})\n` +
                    `Update: ${ctx.updateType}\n` +
                    `Error: ${err.message}\n` +
                    `Stack: ${err.stack?.substring(0, 500)}`
                );
            }
        });
    }
    
    async startWebhook() {
        if (ENVIRONMENT === 'production') {
            const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
            await this.bot.telegram.setWebhook(webhookUrl);
            console.log('Webhook set to:', webhookUrl);
        }
        
        // Start notification scheduler
        this.notifications.startScheduler();
        
        console.log('BodyShapeCoach Bot is running!');
    }
    
    async handleUpdate(update) {
        return await this.bot.handleUpdate(update);
    }
    
    async handleWebhook(request) {
        try {
            const update = await request.json();
            await this.handleUpdate(update);
            return new Response('OK', { status: 200 });
        } catch (error) {
            console.error('Webhook error:', error);
            return new Response('ERROR', { status: 500 });
        }
    }
}

// Cloudflare Worker entry point
export default {
    async fetch(request, env, ctx) {
        // Set environment variables
        process.env.BOT_TOKEN = env.BOT_TOKEN;
        process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        process.env.ADMIN_ID = env.ADMIN_ID;
        process.env.WEBHOOK_URL = env.WEBHOOK_URL;
        
        // Initialize bot
        const bot = new BodyShapeCoachBot();
        
        // Handle webhook
        if (request.method === 'POST') {
            return await bot.handleWebhook(request);
        }
        
        // Return basic info for GET requests
        return new Response(
            JSON.stringify({
                name: 'BodyShapeCoach Bot',
                status: 'running',
                version: '1.0.0'
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            }
        );
    },
    
    async scheduled(event, env, ctx) {
        // Handle scheduled tasks
        process.env.BOT_TOKEN = env.BOT_TOKEN;
        
        const bot = new Telegraf(env.BOT_TOKEN);
        const db = new DatabaseService();
        const notifications = new NotificationService(bot, db);
        
        await notifications.sendScheduledNotifications();
        
        // Clean up old data
        await db.cleanupOldData();
    }
};
