const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Load all models to ensure proper registration
require('./models');

// Create Express app
const app = express();

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'https://smart-leave-mern.vercel.app'
    ];
    
    // Also allow any vercel.app domain (for preview deployments)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartleave')
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'SmartLeave API is running' });
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Leave routes
const leaveRoutes = require('./routes/leave');
app.use('/api/leave-requests', leaveRoutes);

// Department routes
const departmentRoutes = require('./routes/department');
app.use('/api/department', departmentRoutes);

// Settings routes
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);

// HR routes
const hrRoutes = require('./routes/hr');
app.use('/api/hr', hrRoutes);

// HR Employees routes
const hrEmployeesRoutes = require('./routes/hrEmployees');
app.use('/api/hr/employees', hrEmployeesRoutes);

// Leave Records routes
const leaveRecordsRoutes = require('./routes/leaveRecords');
app.use('/api/leave-records', leaveRecordsRoutes);

// Mayor routes
const mayorRoutes = require('./routes/mayor');
app.use('/api/mayor', mayorRoutes);

// FCM routes
const fcmRoutes = require('./routes/fcm');
app.use('/api/auth', fcmRoutes);

// Notification routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});