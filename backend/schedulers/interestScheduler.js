import cron from 'node-cron';
import fdModel from '../models/fdModel.js';

// =============================================
// MONTHLY FD INTEREST CALCULATION 
// Runs at 2:00 AM on the 1st day of every month
// =============================================
cron.schedule('0 2 1 * *', async () => {
    console.log('💰 Running automatic monthly FD interest calculation...', new Date().toISOString());
    
    try {
        const count = await fdModel.calculateMonthlyInterest();
        console.log(`✅ Monthly interest calculated for ${count} FDs`);
        
        if (count > 0) {
            // You could add email notification here for managers
            console.log(`📊 ${count} FDs received interest calculation this month`);
        }
    } catch (error) {
        console.error('❌ Monthly interest calculation error:', error);
    }
});

// =============================================
// DAILY FD MATURITY CHECK (optional - for notifications)
// Runs at 8:00 AM every day
// =============================================
cron.schedule('0 8 * * *', async () => {
    console.log('🔍 Checking for maturing FDs...', new Date().toISOString());
    
    try {
        // Get FDs maturing in next 7 days
        const maturingFDs = await fdModel.getMaturingFDs(7);
        
        if (maturingFDs.length > 0) {
            console.log(`📅 ${maturingFDs.length} FDs maturing in next 7 days`);
            // You could send notifications to managers here
        }
    } catch (error) {
        console.error('❌ FD maturity check error:', error);
    }
});

export default { 
    start: () => console.log('⏰ FD interest scheduler started (runs monthly on 1st at 2 AM)') 
};