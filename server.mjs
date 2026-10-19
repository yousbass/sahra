// Local API development. Vercel imports api/index.ts instead.
import app from './server/app.ts';
app.listen(Number(process.env.PORT || 3001), '0.0.0.0');
