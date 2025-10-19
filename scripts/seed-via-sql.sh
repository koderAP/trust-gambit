#!/bin/bash

# This script adds 100 dummy users directly via SQL
# Password for all users: "password123" (bcrypt hashed)
# Hash generated: $2a$10$YourHashHere

# The bcrypt hash for "password123"
PASSWORD_HASH='$2a$10$K7L1Oqh9/.Gb1kPCWCmq0.YJXqH.xvYJ4Y7rO2AqM9rLZYxD9HZ9i'

# Connect to PostgreSQL and insert users
PGPASSWORD=changeme123 docker exec -i trustgambit-db psql -U trustgambit -d trustgambit << EOF

-- Start transaction
BEGIN;

-- Insert 100 dummy users
DO \$\$
DECLARE
  i INTEGER;
  first_names TEXT[] := ARRAY['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 
                                'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
                                'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen',
                                'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
                                'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
                                'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
                                'Benjamin', 'Samuel', 'Raymond', 'Gregory', 'Frank', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry',
                                'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle',
                                'Walter', 'Ethan', 'Jeremy', 'Harold', 'Keith', 'Christian', 'Roger', 'Noah', 'Gerald', 'Carl',
                                'Terry', 'Sean', 'Austin', 'Arthur', 'Lawrence', 'Jesse', 'Dylan', 'Bryan', 'Joe', 'Jordan'];
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                              'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                              'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
                              'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
                              'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
                              'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
                              'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
                              'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
                              'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
                              'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];
  user_id UUID;
  first_name TEXT;
  last_name TEXT;
  user_email TEXT;
  user_name TEXT;
BEGIN
  FOR i IN 1..100 LOOP
    first_name := first_names[(i % 100) + 1];
    last_name := last_names[((i * 7) % 100) + 1];
    user_name := first_name || ' ' || last_name;
    user_email := lower(first_name) || '.' || lower(last_name) || i || '@trustgambit.test';
    
    -- Check if user exists
    SELECT id INTO user_id FROM "User" WHERE email = user_email LIMIT 1;
    
    IF user_id IS NULL THEN
      -- Insert user
      INSERT INTO "User" (id, name, email, password, "profileComplete", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), user_name, user_email, '$PASSWORD_HASH', true, NOW(), NOW())
      RETURNING id INTO user_id;
      
      -- Insert domain ratings for this user
      INSERT INTO "DomainRating" (id, "userId", domain, rating, reason, "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), user_id, 'Algorithms', (i % 11), 'Strong background in algorithms', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Finance', ((i * 2) % 11), 'Experience in financial modeling', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Economics', ((i * 3) % 11), 'Studied economic theory', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Statistics', ((i * 4) % 11), 'Good statistical knowledge', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Probability', ((i * 5) % 11), 'Understanding of probability', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Machine Learning', ((i * 6) % 11), 'ML project experience', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Crypto', ((i * 7) % 11), 'Cryptocurrency knowledge', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Biology', ((i * 8) % 11), 'Basic biology understanding', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Indian History', ((i * 9) % 11), 'History enthusiast', NOW(), NOW()),
        (gen_random_uuid(), user_id, 'Game Theory', ((i * 10) % 11), 'Game theory courses taken', NOW(), NOW());
      
      RAISE NOTICE 'Created user %: % (%)', i, user_name, user_email;
    ELSE
      RAISE NOTICE 'User % already exists: %', i, user_email;
    END IF;
  END LOOP;
END \$\$;

-- Commit transaction
COMMIT;

-- Show count
SELECT COUNT(*) as total_users FROM "User";

EOF

echo "✅ Script completed!"
