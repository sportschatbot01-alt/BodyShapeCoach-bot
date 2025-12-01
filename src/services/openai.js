import OpenAI from 'openai';

export default class OpenAIService {
    constructor(apiKey) {
        this.client = new OpenAI({ apiKey });
        this.systemPrompt = `You are BodyShapeCoach, an expert nutritionist, dietitian, and fitness coach. 
        You provide personalized diet plans, calculate nutritional values, and offer fitness advice. 
        Always consider cultural preferences, traditional foods, and individual restrictions.`;
    }
    
    async generateMealPlan(userProfile) {
        const prompt = this.buildMealPlanPrompt(userProfile);
        
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });
            
            return this.parseMealPlanResponse(response.choices[0].message.content);
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw new Error('Failed to generate meal plan');
        }
    }
    
    async analyzeFoodImage(imageUrl, userContext = null) {
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analyze this food image and provide detailed nutritional information.
                                Consider the following user context if available: ${JSON.stringify(userContext)}
                                
                                Provide the following in JSON format:
                                {
                                    "food_items": [
                                        {
                                            "name": "food name",
                                            "quantity": "estimated quantity",
                                            "unit": "grams/ml/pieces",
                                            "calories": number,
                                            "protein_g": number,
                                            "carbs_g": number,
                                            "fat_g": number
                                        }
                                    ],
                                    "total_calories": number,
                                    "total_protein_g": number,
                                    "total_carbs_g": number,
                                    "total_fat_g": number,
                                    "confidence_score": number (0-1),
                                    "notes": "additional observations"
                                }`
                            },
                            {
                                type: "image_url",
                                image_url: { url: imageUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            });
            
            const content = response.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('OpenAI Vision API Error:', error);
            throw new Error('Failed to analyze food image');
        }
    }
    
    async calculateTDEE(userData) {
        const prompt = `Calculate BMR and TDEE for:
        Gender: ${userData.gender}
        Age: ${userData.age}
        Height: ${userData.height_cm} cm
        Weight: ${userData.weight_kg} kg
        Activity Level: ${userData.activity_level}
        Goal: ${userData.fitness_goal}
        
        Use the Mifflin-St Jeor equation for BMR.
        Apply appropriate activity multiplier.
        Adjust for goal with appropriate surplus/deficit.
        
        Return JSON with: bmr, tdee, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g`;
        
        const response = await this.client.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert in nutritional calculations and metabolic rates."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });
        
        return JSON.parse(response.choices[0].message.content);
    }
    
    buildMealPlanPrompt(userProfile) {
        return `
        Create a detailed, personalized meal plan with the following information:
        
        PERSONAL INFORMATION:
        - Age: ${userProfile.age}
        - Gender: ${userProfile.gender}
        - Height: ${userProfile.height_cm} cm
        - Weight: ${userProfile.weight_kg} kg
        - Goal Weight: ${userProfile.goal_weight_kg} kg
        - Fitness Goal: ${userProfile.fitness_goal}
        - Activity Level: ${userProfile.activity_level}
        
        HEALTH CONSIDERATIONS:
        - Conditions: ${userProfile.health_conditions || 'None'}
        - Allergies: ${userProfile.food_allergies || 'None'}
        - Medications: ${userProfile.medications || 'None'}
        
        DIETARY PREFERENCES:
        - Diet Type: ${userProfile.diet_type}
        - Preferred Foods: ${userProfile.preferred_foods}
        - Disliked Foods: ${userProfile.disliked_foods}
        
        LIFESTYLE:
        - Location: ${userProfile.country}, ${userProfile.city}
        - Traditional Foods: ${userProfile.traditional_foods}
        - Work Schedule: ${userProfile.work_schedule}
        - Meals Per Day: ${userProfile.meals_per_day}
        
        TRAINING:
        - Training Location: ${userProfile.training_location}
        - Training Days/Week: ${userProfile.training_days_per_week}
        - Experience: ${userProfile.training_experience}
        
        CALORIE & MACRO TARGETS:
        - Daily Calories: ${userProfile.daily_calories}
        - Protein: ${userProfile.daily_protein_g}g
        - Carbs: ${userProfile.daily_carbs_g}g
        - Fat: ${userProfile.daily_fat_g}g
        
        Create a ${userProfile.meals_per_day}-meal plan that:
        1. Meets the calorie and macro targets
        2. Includes traditional foods from ${userProfile.country}
        3. Considers food preferences and restrictions
        4. Provides variety and balance
        5. Includes portion sizes in both grams and household measures
        6. Includes a shopping list
        7. Provides preparation tips
        
        Format the response in clear sections with emojis for readability.`;
    }
    
    parseMealPlanResponse(responseText) {
        // Parse and structure the AI response
        const sections = {
            summary: '',
            meals: [],
            shoppingList: [],
            preparationTips: '',
            nutritionalSummary: {}
        };
        
        // Implementation for parsing the response
        return sections;
    }
}
