import { v4 as uuidv4 } from 'uuid';

export default class SubscriptionService {
    constructor(db) {
        this.db = db;
        this.plans = {
            monthly: {
                name: 'Monthly Plan',
                price: '$19.99',
                durationDays: 30,
                features: [
                    'Personalized meal plans',
                    'Daily calorie tracking',
                    'Food image analysis',
                    'Weekly progress reports',
                    'Priority support'
                ]
            },
            quarterly: {
                name: 'Quarterly Plan',
                price: '$49.99',
                durationDays: 90,
                features: [
                    'Everything in Monthly',
                    'Custom workout plans',
                    'Monthly check-ins',
                    'Recipe database access'
                ]
            },
            yearly: {
                name: 'Yearly Plan',
                price: '$149.99',
                durationDays: 365,
                features: [
                    'Everything in Quarterly',
                    'Personal coach access',
                    'Advanced analytics',
                    'Family plan options'
                ]
            }
        };
    }
    
    async checkActiveSubscription(userId) {
        const subscription = await this.db.getActiveSubscription(userId);
        
        if (!subscription) {
            return false;
        }
        
        const now = new Date();
        const endDate = new Date(subscription.end_date);
        
        if (endDate < now) {
            await this.db.updateSubscriptionStatus(subscription.id, 'expired');
            return false;
        }
        
        return subscription.status === 'active';
    }
    
    async activateSubscription(userId, subscriptionKey) {
        // Validate the key
        const keyInfo = await this.db.validateSubscriptionKey(subscriptionKey);
        
        if (!keyInfo || !keyInfo.is_active) {
            throw new Error('Invalid subscription key');
        }
        
        if (keyInfo.expires_at && new Date(keyInfo.expires_at) < new Date()) {
            throw new Error('Subscription key has expired');
        }
        
        if (keyInfo.max_uses <= keyInfo.used_count) {
            throw new Error('Subscription key has reached maximum uses');
        }
        
        // Create subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + keyInfo.duration_days);
        
        const subscriptionData = {
            user_id: userId,
            subscription_key: subscriptionKey,
            plan_type: keyInfo.plan_type,
            start_date: new Date().toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'active'
        };
        
        await this.db.createSubscription(subscriptionData);
        
        // Update key usage
        await this.db.incrementKeyUsage(subscriptionKey);
        
        return {
            success: true,
            plan: keyInfo.plan_type,
            end_date: endDate,
            message: 'Subscription activated successfully!'
        };
    }
    
    async generateSubscriptionKeys(count, planType = 'monthly', durationDays = 30, createdBy = 'admin') {
        const keys = [];
        
        for (let i = 0; i < count; i++) {
            const key = `BSCOACH-${planType.toUpperCase()}-${uuidv4().split('-')[0]}`;
            
            keys.push({
                subscription_key: key,
                plan_type: planType,
                duration_days: durationDays,
                created_by: createdBy,
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year expiry
            });
        }
        
        await this.db.bulkInsertSubscriptionKeys(keys);
        
        return keys.map(k => k.subscription_key);
    }
    
    async getSubscriptionPlans(language = 'en') {
        // Return plans with localized text
        const localizedPlans = {};
        
        for (const [key, plan] of Object.entries(this.plans)) {
            localizedPlans[key] = {
                ...plan,
                localizedName: this.getLocalizedText(`plans.${key}.name`, language) || plan.name,
                localizedFeatures: plan.features.map(feature => 
                    this.getLocalizedText(`plans.${key}.features.${feature}`, language) || feature
                )
            };
        }
        
        return localizedPlans;
    }
    
    getLocalizedText(key, language) {
        // Implementation for localization
        return null;
    }
    
    async sendReminderNotifications() {
        // Send reminders 7 days, 3 days, and 1 day before expiry
        const expiringSubscriptions = await this.db.getExpiringSubscriptions([7, 3, 1]);
        
        for (const subscription of expiringSubscriptions) {
            const daysLeft = Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            // Send notification via bot
            // Implementation depends on your bot instance
        }
    }
}
