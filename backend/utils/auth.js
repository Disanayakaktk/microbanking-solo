import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hash password
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.employee_id, 
            username: user.username,
            role: user.position 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Verify JWT token
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};