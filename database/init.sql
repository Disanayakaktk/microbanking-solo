-- First, create ENUM types
DROP TYPE IF EXISTS account_status_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP TYPE IF EXISTS plan_type_enum CASCADE;
DROP TYPE IF EXISTS fd_options_enum CASCADE;
DROP TYPE IF EXISTS employee_position_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS calculation_status_enum CASCADE;
DROP TYPE IF EXISTS fd_status_enum CASCADE;
DROP TYPE IF EXISTS audit_status_enum CASCADE;

CREATE TYPE account_status_enum AS ENUM ('active', 'closed');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE plan_type_enum AS ENUM ('Children', 'Teen', 'Adult', 'Senior', 'Joint');
CREATE TYPE fd_options_enum AS ENUM ('6 months', '1 year', '3 years', '5 years');
CREATE TYPE employee_position_enum AS ENUM ('Manager', 'Agent', 'Admin');
CREATE TYPE transaction_type_enum AS ENUM ('Deposit', 'Withdrawal', 'Interest Credit');
CREATE TYPE calculation_status_enum AS ENUM ('pending', 'completed');
CREATE TYPE fd_status_enum AS ENUM ('active', 'matured', 'closed');
CREATE TYPE audit_status_enum AS ENUM ('success', 'failure');

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS transaction_audit_log CASCADE;
DROP TABLE IF EXISTS customer_audit_log CASCADE;
DROP TABLE IF EXISTS account_plan_change_audit CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS savings_interest_calculation CASCADE;
DROP TABLE IF EXISTS fd_interest_calculation CASCADE;
DROP TABLE IF EXISTS takes CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS fixed_deposits CASCADE;
DROP TABLE IF EXISTS fd_plans CASCADE;
DROP TABLE IF EXISTS saving_plans CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS branch CASCADE;
DROP TABLE IF EXISTS contact CASCADE;



-- 1. Create tables with NO foreign key dependencies FIRST

-- Create contact table
create table contact (
    contact_id serial primary key,
    contact_no_1 varchar(15) not null,
    contact_no_2 varchar(15),
    address varchar(255) not null,
    email varchar(100) not null unique,
    created_at timestamp
);

-- Create fd_plans table
create table fd_plans (
    fd_plan_id serial primary key,
    fd_options fd_options_enum not null,
    interest decimal(5,2) not null,
    created_at timestamp
);

-- Create saving_plans table
create table saving_plans (
    saving_plan_id serial primary key,
    plan_type plan_type_enum not null,
    interest decimal(5,2) not null,
    min_balance decimal(10,2) not null,
    created_at timestamp
);


-- 2. Create tables that depend on the above tables

-- Create branch table
create table branch (
    branch_id serial primary key,
    branch_name varchar(50) not null,
    created_at timestamp,
    contact_id int references contact(contact_id) on delete set null
);

-- Create customers table
create table customers (
    customer_id serial primary key,
    first_name varchar(50) not null,
    last_name varchar(50) not null,
    gender gender_enum not null,
    nic varchar(30) not null unique,
    date_of_birth date not null,
    created_at timestamp,
    contact_id int references contact(contact_id) on delete set null
);

-- Create fixed_deposits table
create table fixed_deposits (
    fd_id serial primary key,
    fd_balance decimal(15, 2) not null,
    auto_renewal boolean not null,
    fd_status fd_status_enum not null,
    open_date date not null,
    created_at timestamp,
    fd_plan_id int references fd_plans(fd_plan_id) on delete set null
);

-- Create Employees table
create table employees (
    employee_id serial primary key,
    position employee_position_enum not null,
    username varchar(50) not null unique,
    password varchar(255) not null,
    first_name varchar(50) not null,
    last_name varchar(50) not null,
    nic varchar(15) not null unique,
    gender gender_enum not null,
    date_of_birth date not null,
    created_at timestamp,
    branch_id int references branch(branch_id) on delete set null,
    contact_id int references contact(contact_id) on delete set null
);

-- Create accounts table
create table accounts (
    account_id serial primary key,
    open_date date not null,
    account_status account_status_enum not null,
    balance decimal(15, 2) not null,
    closed_at timestamp,
    created_at timestamp, 
    branch_id int references branch(branch_id) on delete set null,
    saving_plan_id int references saving_plans(saving_plan_id) on delete set null,
    fd_id int references fixed_deposits(fd_id) on delete set null
);


-- 3. Create tables that depend on accounts and customers

-- Create takes table to link customers and accounts
create table takes (
    takes_id serial primary key,
    created_at timestamp,
    customer_id int references customers(customer_id) on delete cascade,
    account_id int references accounts(account_id) on delete cascade
);

-- Create savings_interest_calculation table
create table savings_interest_calculation (
    s_calculation_id serial primary key,
    calculation_date date not null,
    interest_amount decimal(15, 2) not null,
    interest_rate decimal(5, 2) not null,
    plan_type plan_type_enum not null,
    credited_at timestamp,
    status calculation_status_enum not null,
    created_at timestamp,
    account_id int references accounts(account_id) on delete cascade
);

-- fd interest calculation table
create table fd_interest_calculation (
    fd_calculation_id serial primary key,
    calculation_date date not null,
    interest_amount decimal(15, 2) not null,
    days_in_period int not null,
    credited_at timestamp,
    status calculation_status_enum not null,
    created_at timestamp,
    fd_id int references fixed_deposits(fd_id) on delete cascade,
    credited_to_account_id int references accounts(account_id) on delete set null
);

-- Create Transaction table
create table transactions (
    transaction_id serial primary key,
    transaction_type transaction_type_enum not null,
    amount decimal(10, 2) not null,
    time timestamp not null,
    description text,
    created_at timestamp,
    account_id int references accounts(account_id) on delete cascade,
    employee_id int references employees(employee_id)
);


-- 4. Create audit tables (depend on multiple tables)

-- Create account_plan_change_audit table
create table account_plan_change_audit (
    audit_id serial primary key,
    reason text,
    changed_at timestamp default current_timestamp,
    account_id int references accounts(account_id) on delete cascade,
    old_saving_plan_id int references saving_plans(saving_plan_id) on delete set null,
    new_saving_plan_id int references saving_plans(saving_plan_id) on delete set null,
    changed_by_employee_id int references employees(employee_id) on delete set null
);

-- Create transaction audit log table
create table transaction_audit_log (
    audit_id serial primary key,
    transaction_type transaction_type_enum not null,
    amount decimal(12, 2) not null,
    attempted_time timestamp not null,
    description text,
    status audit_status_enum not null,
    error_message text,
    created_at timestamp,
    account_id int references accounts(account_id) on delete cascade,
    employee_id int references employees(employee_id)
);

-- Create Customer audit log table
create table customer_audit_log (
    audit_id serial primary key,
    changed_at timestamp default current_timestamp,
    changed_fields text[],
    old_data jsonb,
    new_data jsonb,
    customer_id int references customers(customer_id) on delete cascade,
    changed_by_employee_id int references employees(employee_id) on delete set null
);



