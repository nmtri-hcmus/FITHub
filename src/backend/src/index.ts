import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import progressRoutes from './routes/progress.routes';
import foodRoutes from './routes/food.routes';
import mealsRoutes from './routes/meals.routes';

const app = express();
const httpServer = createServer(app);

// Enable JSON body parsing for API requests (increased limit for Base64 image uploads)
app.use(express.json({ limit: '50mb' }));

// Allowed origins: reads from FRONTEND_URL env var in production, falls back to localhost for local dev
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:4321', 'http://127.0.0.1:4321']
  : ['http://localhost:4321', 'http://127.0.0.1:4321'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Initialize Socket.io on top of our HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  }
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/meals', mealsRoutes);

// A basic health-check endpoint to verify the API is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'FITHub API is running smoothly!' });
});

// Listen for real-time socket connections
io.on('connection', (socket) => {
  console.log(`[Socket.io] A user connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.io] User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});