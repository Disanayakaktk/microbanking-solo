import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import db from './config/database.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);

// Test route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

// Test database route
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() as current_time');
        res.json({ 
            success: true, 
            message: 'Database connected!',
            time: result.rows[0].current_time
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Test server: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Test database: http://localhost:${PORT}/api/test-db`);
});