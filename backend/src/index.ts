import express from 'express';
import 'dotenv/config';

import { BotService } from './bot.js';

const botService = new BotService(); // Create an instance of the BotService class

// Create an instance of the Express application
const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Setup listening server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start the bot service
botService.start().catch((err: any) => {
  console.error('Failed to start the bot service:', err);
  process.exit(1); // Exit the process with an error code
});