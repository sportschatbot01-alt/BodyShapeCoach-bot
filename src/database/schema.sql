-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    -- Personal Data
    age INTEGER,
    gender VARCHAR(10) CHECK(gender IN ('male', 'female', 'other')),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    goal_weight_kg DECIMAL(5,2),
    
    -- Fitness Goal
    fitness_goal VARCHAR(50) CHECK(fitness_goal IN (
        'lose_weight', 
        'gain_weight', 
        'build_muscle', 
        'recomposition', 
        'maintain'
    )),
    activity_level VARCHAR(50) CHECK(activity_level IN (
        'sedentary',
        'lightly_active',
        'moderately_active',
        'very_active',
        'athlete'
    )),
    
    -- Health Information
    health_conditions TEXT,
    food_allergies TEXT,
    medications TEXT,
    
    -- Dietary Preferences
    diet_type VARCHAR(50) CHECK(diet_type IN (
        'standard_balanced',
        'high_protein',
        'mediterranean',
        'low_carb',
        'keto',
        'vegetarian',
        'vegan',
        'halal'
    )),
    preferred_foods TEXT,
    disliked_foods TEXT,
    
    -- Daily Lifestyle
    work_schedule VARCHAR(20) CHECK(work_schedule IN ('day', 'night', 'shift')),
    meals_per_day INTEGER CHECK(meals_per_day BETWEEN 1 AND 6),
    preference_type VARCHAR(20) CHECK(preference_type IN ('meal_plans', 'macro_targets', 'both')),
    
    -- Gym & Training
    training_location VARCHAR(20) CHECK(training_location IN ('gym', 'home', 'none')),
    training_days_per_week INTEGER CHECK(training_days_per_week BETWEEN 0 AND 7),
    training_experience VARCHAR(20) CHECK(training_experience IN ('beginner', 'intermediate', 'advanced')),
    
    -- Body Composition
    body_fat_percent DECIMAL(4,2),
    muscle_mass_kg DECIMAL(5,2),
    inbody_document_url TEXT,
    
    -- Location & Timezone
    country VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    traditional_foods TEXT,
    
    -- Calculated Metrics
    bmr DECIMAL(8,2),
    tdee DECIMAL(8,2),
    daily_calories DECIMAL(8,2),
    daily_protein_g DECIMAL(6,2),
    daily_carbs_g DECIMAL(6,2),
    daily_fat_g DECIMAL(6,2),
    
    -- Status
    profile_completed BOOLEAN DEFAULT 0,
    last_assessment_date DATE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subscription_key VARCHAR(50) UNIQUE NOT NULL,
    plan_type VARCHAR(20) CHECK(plan_type IN ('monthly', 'quarterly', 'yearly', 'lifetime')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status VARCHAR(20) CHECK(status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
    auto_renew BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    log_date DATE NOT NULL,
    
    -- Nutrition
    calories_consumed DECIMAL(8,2),
    protein_g DECIMAL(6,2),
    carbs_g DECIMAL(6,2),
    fat_g DECIMAL(6,2),
    water_intake_ml INTEGER,
    
    -- Activity
    exercise_type VARCHAR(100),
    exercise_minutes INTEGER,
    steps_count INTEGER,
    
    -- Body Metrics
    weight_kg DECIMAL(5,2),
    body_fat_percent DECIMAL(4,2),
    
    -- Mood & Energy
    energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
    mood VARCHAR(20),
    sleep_hours DECIMAL(3,1),
    
    -- Notes
    notes TEXT,
    challenges TEXT,
    achievements TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, log_date)
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_date DATE NOT NULL,
    plan_type VARCHAR(50),
    
    -- Meal structure (stored as JSON)
    breakfast JSON,
    lunch JSON,
    dinner JSON,
    snacks JSON,
    
    -- Totals
    total_calories DECIMAL(8,2),
    total_protein_g DECIMAL(6,2),
    total_carbs_g DECIMAL(6,2),
    total_fat_g DECIMAL(6,2),
    
    -- Additional info
    shopping_list TEXT,
    preparation_notes TEXT,
    traditional_dishes_included TEXT,
    
    -- Status
    completed BOOLEAN DEFAULT 0,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    feedback TEXT,
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, plan_date)
);

-- Food analysis table
CREATE TABLE IF NOT EXISTS food_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    file_id VARCHAR(100),
    
    -- Analysis results (JSON)
    analysis_result JSON NOT NULL,
    food_items JSON,
    
    -- Estimated nutrition
    estimated_calories DECIMAL(8,2),
    estimated_protein_g DECIMAL(6,2),
    estimated_carbs_g DECIMAL(6,2),
    estimated_fat_g DECIMAL(6,2),
    
    -- Confidence & accuracy
    confidence_score DECIMAL(4,2),
    manual_override BOOLEAN DEFAULT 0,
    corrected_calories DECIMAL(8,2),
    
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notification_type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    scheduled_time TIME,
    sent_at TIMESTAMP,
    status VARCHAR(20) CHECK(status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subscription keys (for generation and distribution)
CREATE TABLE IF NOT EXISTS subscription_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_key VARCHAR(50) UNIQUE NOT NULL,
    plan_type VARCHAR(20),
    duration_days INTEGER,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE,
    is_active BOOLEAN DEFAULT 1
);

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, plan_date);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_subscription_keys_key ON subscription_keys(subscription_key);

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users 
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_subscriptions_timestamp 
AFTER UPDATE ON subscriptions 
BEGIN
    UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
