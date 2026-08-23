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
import recipeRoutes from './routes/recipe.routes';
import calendarRoutes from './routes/calendar.routes';
import aiRoutes from './routes/ai.routes';
import coachRoutes from './routes/coach.routes';
import paymentRoutes from './routes/payment.routes';
import chatRoutes from './routes/chat.routes';
import communityRoutes from './routes/community.routes';
import adminRoutes from './routes/admin.routes';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import { ChatService } from './services/chat.service';
import { LeaderboardService } from './services/leaderboard.service';

const app = express();
const httpServer = createServer(app);

// Allowed origins: reads from FRONTEND_URL env var in production, falls back to localhost for local dev
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:4321', 'http://127.0.0.1:4321']
  : ['http://localhost:4321', 'http://127.0.0.1:4321'];

app.use(cors({
  // Allow all origins in local dev to prevent any CORS block
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));

// Mount payment routes BEFORE express.json() because Stripe webhook requires raw body buffer
app.use('/api/payment', paymentRoutes);

// Enable JSON body parsing for API requests (increased limit for Base64 image uploads)
app.use(express.json({ limit: '50mb' }));

// Initialize Socket.io on top of our HTTP server
const io = new Server(httpServer, {
  cors: {
    // Allow all origins in dev (including file:// which appears as null)
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  }
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);

// A basic health-check endpoint to verify the API is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'FITHub API is running smoothly!' });
});

// Setup /chat Namespace for Real-Time Coaching
const chatNamespace = io.of('/chat');

chatNamespace.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.data.user = decoded;
    next();
  });
});

chatNamespace.on('connection', (socket) => {
  console.log(`[Socket.io/chat] User connected: ${socket.data.user.id}`);

  // User requests to join a specific conversation room with a coach/client
  socket.on('join-room', (otherUserId: string) => {
    const roomKey = ChatService.generateConversationKey(socket.data.user.id, otherUserId);
    socket.join(roomKey);
    console.log(`[Socket.io/chat] User ${socket.data.user.id} joined room ${roomKey}`);
  });

  // Handle incoming messages
  socket.on('send-message', async (data: { receiverId: string; content: string; mediaUrl?: string }) => {
    try {
      const senderId = socket.data.user.id;
      const roomKey = ChatService.generateConversationKey(senderId, data.receiverId);
      
      // Save to database
      const message = await ChatService.saveMessage(senderId, data.receiverId, data.content, data.mediaUrl);
      
      // Broadcast to everyone in the room (including sender to confirm receipt)
      chatNamespace.to(roomKey).emit('receive-message', message);
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('typing', (receiverId: string) => {
    const roomKey = ChatService.generateConversationKey(socket.data.user.id, receiverId);
    socket.to(roomKey).emit('typing', { userId: socket.data.user.id });
  });

  socket.on('stop-typing', (receiverId: string) => {
    const roomKey = ChatService.generateConversationKey(socket.data.user.id, receiverId);
    socket.to(roomKey).emit('stop-typing', { userId: socket.data.user.id });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io/chat] User disconnected: ${socket.data.user.id}`);
  });
});


const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  
  // Initialize Leaderboard Cron (runs every midnight)
  cron.schedule('0 0 * * *', () => {
    LeaderboardService.calculateAndCacheLeaderboard();
  });
  
  // Run once on startup for dev purposes
  LeaderboardService.calculateAndCacheLeaderboard();
});