CREATE TABLE Listener (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    image VARCHAR(255),
    age INT NOT NULL,
    language VARCHAR(255),
    favoriteFood VARCHAR(255),
    hobbies VARCHAR(255),
    idols VARCHAR(255),
    sex ENUM('MALE', 'FEMALE'),
    about TEXT,
    device_token VARCHAR(255) NOT NULL,
    online_status BOOLEAN DEFAULT FALSE,
    busy_status BOOLEAN DEFAULT FALSE,
    ac_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    wallet INT DEFAULT 0
);

CREATE TABLE User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    image VARCHAR(255),
    device_token VARCHAR(255) NOT NULL,
    interests ENUM('CASUAL_RELATIONSHIP', 'DATING', 'SERIOUS_DATING'),
    age INT NOT NULL,
    sex ENUM('MALE', 'FEMALE') NOT NULL,
    bio TEXT,
    language VARCHAR(255),
    relationship VARCHAR(255),
    star_sign VARCHAR(255),
    pets VARCHAR(255),
    drinking ENUM('YES', 'NO'),
    smoking ENUM('YES', 'NO'),
    busy_status BOOLEAN DEFAULT FALSE,
    ac_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    wallet INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE User_work (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    position VARCHAR(255),
    salary INT,
    userId INT,
    FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE User_education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    highestqualification VARCHAR(255),
    college_name VARCHAR(255),
    school_name VARCHAR(255),
    userId INT,
    FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE BlockedUsers (
    listenerId INT,
    userId INT,
    PRIMARY KEY (listenerId, userId),
    FOREIGN KEY (listenerId) REFERENCES Listener(id),
    FOREIGN KEY (userId) REFERENCES User(id)
);

CREATE TABLE Transaction (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    listenerId INT NOT NULL,
    amount FLOAT NOT NULL,
    listenerShare FLOAT NOT NULL,
    appShare FLOAT NOT NULL,
    status VARCHAR(255) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id),
    FOREIGN KEY (listenerId) REFERENCES Listener(id)
);