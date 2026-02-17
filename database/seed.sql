-- Insert test admin user
INSERT INTO employees (position, username, password, first_name, last_name, nic, gender, date_of_birth, created_at) 
VALUES ('Admin', 'admin', '$2b$10$HiDVSJbi6znq5SFDrrUeFO3LmRgYTTxyIseaqEVQQx9Rl3ucUVAXa', 'Admin', 'User', '123456789V', 'male', '1990-01-01', NOW());

-- Insert test contact (for customers)
INSERT INTO contact (contact_no_1, address, email) 
VALUES ('0771234567', 'Colombo', 'test@email.com');

-- Insert test customer
INSERT INTO customers (first_name, last_name, gender, nic, date_of_birth, contact_id, created_at) 
VALUES ('John', 'Doe', 'male', '123456788V', '1995-05-15', 1, NOW());

-- Insert test saving plan
INSERT INTO saving_plans (plan_type, interest, min_balance, created_at) 
VALUES ('Adult', 4.0, 1000, NOW());

-- Insert test branch
INSERT INTO branch (branch_name, created_at) 
VALUES ('Main Branch', NOW());