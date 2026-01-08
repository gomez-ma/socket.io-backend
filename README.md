## Database
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


## Run
# npm install
# npm run dev
