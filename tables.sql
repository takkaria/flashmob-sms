CREATE TABLE numbers (id SERIAL PRIMARY KEY, data TEXT);
CREATE TABLE messages (id SERIAL PRIMARY KEY, message TEXT);
CREATE TABLE status (id SERIAL PRIMARY KEY, state BOOLEAN);

INSERT INTO status VALUES (1, false);