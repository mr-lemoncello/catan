// server.js
import { handler } from './build/handler.js';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Serve static files with proper caching
app.use(express.static('build/client', {
  maxAge: '1y',
  etag: false
}));

// SvelteKit handler
app.use(handler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});