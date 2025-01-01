const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const mysql = require('mysql2/promise');
const http = require('http');
const socket = require('./socket');
const connectDb = require('./config/dbConnection');



// Connect to the database
connectDb();

// Initialize the app
const app = express();
const server = http.createServer(app);
const io = socket.init(server);
const PORT = process.env.PORT || 3200;

// Enable CORS
app.use(cors());
app.use(cors({origin:'*'}));

// Middleware to parse JSON
app.use(express.json());

// User routes
app.use('/admin', require('./routes/adminRoutes.js'));
app.use('/users', require('./routes/userRoutes.js'));
app.use('/listners', require('./routes/listenerRoutes.js'));
app.use('/dashboard', require('./routes/dashboardRoutes.js'));

// Error handler middleware
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Listening to PORT: ${PORT}`);
});