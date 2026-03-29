-- Insert test admin user
INSERT INTO employees (position, username, password, first_name, last_name, nic, gender, date_of_birth, created_at) 
VALUES ('Admin', 'admin', '$2b$10$HiDVSJbi6znq5SFDrrUeFO3LmRgYTTxyIseaqEVQQx9Rl3ucUVAXa', 'Admin', 'User', '123456789V', 'male', '1990-01-01', NOW());

-- Insert test contact (for customers)
INSERT INTO contact (contact_no_1, address, email) 
VALUES ('0771234567', 'Colombo', 'test@email.com');

-- Insert test customer
INSERT INTO customers (first_name, last_name, gender, nic, date_of_birth, contact_id, created_at) 
VALUES ('John', 'Doe', 'male', '123456788V', '1995-05-15', 1, NOW());

-- Insert default saving plans
INSERT INTO saving_plans (plan_type, interest, min_balance, created_at) 
VALUES
('Children', 2.5, 1000, NOW()),
('Teen', 2.75, 2000, NOW()),
('Adult', 3.0, 4000, NOW()),
('Senior', 3.5, 8000, NOW()),
('Joint', 2.75, 5000, NOW());

-- Insert default FD plans
INSERT INTO fd_plans (fd_options, interest, min_amount, penalty_rate, created_at)
VALUES
('6 months', 7.50, 10000, 1.00, NOW()),
('1 year', 9.00, 10000, 1.00, NOW()),
('3 years', 12.00, 10000, 1.00, NOW()),
('5 years', 16.00, 10000, 1.00, NOW());

-- Insert test branch
INSERT INTO branch (branch_name, created_at) VALUES 
('Colombo (Main)', NOW()),
('Gampaha', NOW()),
('Kalutara', NOW()),
('Kandy', NOW()),
('Matale', NOW()),
('Nuwara Eliya', NOW()),
('Galle', NOW()),
('Matara', NOW()),
('Hambantota', NOW()),
('Jaffna', NOW()),
('Kilinochchi', NOW()),
('Mannar', NOW()),
('Vavuniya', NOW()),
('Mullaitivu', NOW()),
('Batticaloa', NOW()),
('Ampara', NOW()),
('Trincomalee', NOW()),
('Kurunegala', NOW()),
('Puttalam', NOW()),
('Anuradhapura', NOW()),
('Polonnaruwa', NOW()),
('Badulla', NOW()),
('Monaragala', NOW()),
('Ratnapura', NOW()),
('Kegalle', NOW());