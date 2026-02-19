# Microbanking System ���

A comprehensive microbanking system backend built with Node.js, Express, and PostgreSQL. This system provides a complete banking platform with user authentication, account management, and transaction processing.

## ��� Features

### Core Banking
- Customer management with NIC validation
- Multiple account types (Savings, Fixed Deposits)
- Joint account support
- Branch management
- Transaction processing (Deposit, Withdrawal, Transfer)

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin, Manager, Agent)
- Audit logs for all critical operations

### Database Schema
- 15 tables with proper relationships
- ENUM types for data consistency
- Foreign key constraints for integrity
- Triggers for automatic validation

### Interest Management
- Savings account interest calculation
- Fixed deposit interest with different term options
- Scheduled interest processing

## ��� Tech Stack

- **Backend**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Environment**: dotenv

## ��� Project Structure
microbanking-solo/
├── backend/
│ ├── config/
│ │ └── database.js # Database connection
│ ├── controllers/
│ │ └── authController.js # Authentication logic
│ ├── models/
│ │ └── employeeModel.js # Database queries
│ ├── middleware/
│ │ └── auth.js # JWT verification
│ ├── routes/
│ │ └── authRoutes.js # API routes
│ ├── utils/
│ │ └── auth.js # Password utilities
│ ├── .env.example # Environment variables template
│ ├── server.js # Main server file
│ └── package.json
├── database/
│ ├── init.sql # Complete database schema
│ └── seed.sql # Sample data
└── README.md
