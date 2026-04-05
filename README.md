# AI UGC Ad Engine

A platform for generating User-Generated Content (UGC) ad scripts utilizing AI. 

## Features
- Complete Authentication (Login/Register)
- Generate creative AI ad scripts based on campaign parameters (niche, pain point, vibe, etc)
- Script refinement and history storage
- Showcase panel to read and visualize output


## Tech Stack
- Frontend: HTML, Tailwind CSS, JavaScript
- Backend API: Node.js, Express
- Database: Prisma ORM with SQLite
- AI Integration: Google Gemini AI

## Running locally

Make sure you have an `.env` file at the root of the project with the following properties:
```
PORT=3000
GEMINI_API_KEY="your_api_key_here"
JWT_SECRET="your_custom_jwt_secret"
DATABASE_URL="file:./dev.db"
```

Then synchronize the database and start the server:
```
npm install
npx prisma db push
node server.js
```

Lastly, open `landing_page.html` or `login.html` locally in your web browser.
