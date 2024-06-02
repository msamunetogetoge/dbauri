-- init.sql

-- スキーマの作成
CREATE SCHEMA myschema;
CREATE SCHEMA myschema2;

-- テーブルの作成
CREATE TABLE myschema.mytable (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL
);

CREATE TABLE myschema.mytable2 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL
);

CREATE TABLE myschema2.mytable (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL
);

-- 初期データの挿入
INSERT INTO myschema.mytable (name, age) VALUES
('Alice', 30),
('Bob', 25),
('Charlie', 35);

INSERT INTO myschema.mytable2 (name, age) VALUES
('Alice', 30),

INSERT INTO myschema2.mytable (name, age) VALUES
('Alice', 30),
('Bob', 25),
('Charlie', 35);

CREATE USER another_user WITH PASSWORD 'another_password';
GRANT ALL PRIVILEGES ON DATABASE mydatabase TO another_user;
GRANT USAGE ON SCHEMA myschema TO another_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA myschema TO another_user;
