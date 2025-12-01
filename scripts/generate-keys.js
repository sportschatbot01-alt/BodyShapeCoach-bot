#!/usr/bin/env node

import { DatabaseService } from '../src/database/databaseService.js';
import { SubscriptionService } from '../src/services/subscription.js';
import fs from 'fs';

async function generateKeys() {
    const args = process.argv.slice(2);
    const count = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10');
    const planType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'monthly';
    const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'subscription_keys.txt';
    
    console.log(`🔑 Generating ${count} ${planType} subscription keys...`);
    
    // Initialize services
    const db = new DatabaseService();
    const subscription = new SubscriptionService(db);
    
    // Generate keys
    const keys = await subscription.generateSubscriptionKeys(
        count, 
        planType, 
        planType === 'monthly' ? 30 : planType === 'quarterly' ? 90 : 365,
        'system'
    );
    
    // Save to file
    const content = keys.map(key => `${key}`).join('\n');
    fs.writeFileSync(outputFile, content);
    
    console.log(`✅ Generated ${keys.length} keys and saved to ${outputFile}`);
    console.log('\n📋 First 5 keys:');
    keys.slice(0, 5).forEach(key => console.log(`  ${key}`));
    
    if (keys.length > 5) {
        console.log(`  ... and ${keys.length - 5} more`);
    }
}

generateKeys().catch(console.error);
