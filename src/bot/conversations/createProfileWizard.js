import { Scenes } from 'telegraf';
import i18n from '../../utils/i18n.js';

const createProfileWizard = new Scenes.WizardScene(
    'create_profile',
    
    // Step 1: Personal Data
    async (ctx) => {
        await ctx.reply(ctx.t('profile.personal.age'));
        return ctx.wizard.next();
    },
    
    // Step 2: Age
    async (ctx) => {
        const age = parseInt(ctx.message.text);
        if (isNaN(age) || age < 13 || age > 120) {
            await ctx.reply(ctx.t('profile.validation.age'));
            return;
        }
        ctx.wizard.state.data.age = age;
        await ctx.reply(ctx.t('profile.personal.gender'), {
            reply_markup: {
                keyboard: [
                    [{ text: ctx.t('gender.male') }, { text: ctx.t('gender.female') }],
                    [{ text: ctx.t('gender.other') }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
        return ctx.wizard.next();
    },
    
    // Step 3: Gender
    async (ctx) => {
        const gender = ctx.message.text.toLowerCase();
        const validGenders = ['male', 'female', 'other'];
        
        if (!validGenders.includes(gender)) {
            await ctx.reply(ctx.t('profile.validation.gender'));
            return;
        }
        
        ctx.wizard.state.data.gender = gender;
        await ctx.reply(ctx.t('profile.personal.height'), {
            reply_markup: { remove_keyboard: true }
        });
        return ctx.wizard.next();
    },
    
    // Continue with all steps...
    
    // Final Step: Complete Profile
    async (ctx) => {
        const userData = ctx.wizard.state.data;
        const userId = ctx.from.id;
        
        try {
            // Calculate TDEE and macros
            const calculations = await ctx.services.openai.calculateTDEE(userData);
            
            // Save complete profile
            const profileData = {
                ...userData,
                ...calculations,
                profile_completed: true,
                last_assessment_date: new Date().toISOString().split('T')[0]
            };
            
            await ctx.services.db.createOrUpdateProfile(userId, profileData);
            
            await ctx.reply(ctx.t('profile.complete'), {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: ctx.t('menu.generate_plan'), callback_data: 'generate_first_plan' }
                        ]
                    ]
                }
            });
            
            return ctx.scene.leave();
        } catch (error) {
            await ctx.reply(ctx.t('errors.profile_save'));
            return ctx.scene.leave();
        }
    }
);

// Set scene enter handler
createProfileWizard.enter(async (ctx) => {
    ctx.wizard.state.data = {};
    await ctx.reply(ctx.t('profile.welcome'), {
        parse_mode: 'Markdown',
        reply_markup: {
            remove_keyboard: true
        }
    });
});

export default createProfileWizard;
