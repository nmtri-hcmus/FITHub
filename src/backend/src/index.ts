import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import progressRoutes from './routes/progress.routes';

const app = express();
const httpServer = createServer(app);

// Enable JSON body parsing for API requests
app.use(express.json());

// Allow cross-origin requests from the Astro frontend (port 4321)
app.use(cors({
  origin: ['http://localhost:4321', 'http://127.0.0.1:4321'],
  credentials: true,
}));

// Initialize Socket.io on top of our HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*", // We will restrict this in production!
  }
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/progress', progressRoutes); 

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