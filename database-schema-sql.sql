-- PostgreSQL database schema for aid coordination platform

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'receiver', 'admin')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_img VARCHAR(255),
  bio TEXT,
  location VARCHAR(100),
  phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(100),
  reset_token VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collective Causes Table
CREATE TABLE causes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  goal_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual Aid Requests Table
CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  amount_needed DECIMAL(12, 2),
  documents_provided BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request Documents (for verification)
CREATE TABLE request_documents (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id),
  document_type VARCHAR(100) NOT NULL,
  document_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP
);

-- Collective Donations Table
CREATE TABLE cause_donations (
  id SERIAL PRIMARY KEY,
  cause_id INTEGER NOT NULL REFERENCES causes(id),
  user_id INTEGER REFERENCES users(id),  -- Can be NULL for anonymous donations
  amount DECIMAL(12, 2) NOT NULL,
  transaction_id VARCHAR(100),
  payment_method VARCHAR(50),
  is_anonymous BOOLEAN DEFAULT FALSE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Connections Table (Donor-Receiver for Individual Aid)
CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id),
  donor_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMP,
  donor_rating INTEGER CHECK (donor_rating BETWEEN 1 AND 5),
  receiver_rating INTEGER CHECK (receiver_rating BETWEEN 1 AND 5),
  donor_feedback TEXT,
  receiver_feedback TEXT
);

-- Messages Table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES connections(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aid Transactions Table
CREATE TABLE aid_transactions (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES connections(id),
  amount DECIMAL(12, 2),
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('monetary', 'goods', 'services')),
  description TEXT,
  transaction_id VARCHAR(100),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Success Stories Table
CREATE TABLE success_stories (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER REFERENCES connections(id),
  cause_id INTEGER REFERENCES causes(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Platform Statistics Cache Table
CREATE TABLE statistics_cache (
  id SERIAL PRIMARY KEY,
  total_donors INTEGER DEFAULT 0,
  total_receivers INTEGER DEFAULT 0,
  total_causes INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  total_connections INTEGER DEFAULT 0,
  total_aid_amount DECIMAL(15, 2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_urgency ON requests(urgency);
CREATE INDEX idx_requests_location ON requests(location);
CREATE INDEX idx_causes_status ON causes(status);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_donor ON connections(donor_id);
CREATE INDEX idx_connections_request ON connections(request_id);

-- Functions and Triggers

-- Update timestamps on record updates
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_modtime
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_causes_modtime
  BEFORE UPDATE ON causes
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
  
CREATE TRIGGER update_requests_modtime
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
