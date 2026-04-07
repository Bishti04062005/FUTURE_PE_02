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

## Live link:
https://future-pe-02-sigma.vercel.app

## Prompt Used:
"_ASK_:
You are full stack developer. Create an "AI Content Marketing using UGC Ads ".
_CONTRAINTS_:
User Generated Content (UGC) ads:
  1. look like normal Instagram videos
  2.sound like honest customer opinions
  3. outperform traditional ads in conversions
Build a prompt system that generates high-converting UGC ad content, the same way real content marketing agencies work for a local business (salon, cafe, gym, clinic).
Content should feel like it can be directly used in ads.
_FRAMEWORK_:
Problem → solution → CTA"
-->Enter in gemini AI and copy the output.
-->Open Antigravity, create new workspace and select a folder.
-->Click additional button, then click MCP server and type stitch.
-->Then click install and it will asked for API key.
-->Go to Stitch website, go to Stitch setting and create API key.
-->Copy the API key and input it in Antigravity.
--> Add "Use stitch" in the copy output of Gemini AI output.
--> And used "Use stitch" in every prompt you enter for creating UI/UX.
--> Deploy it by Versel after creating the backend.
