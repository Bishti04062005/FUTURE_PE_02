const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient({
    log: ['query', 'error', 'warn']
});
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';

app.use(cors());
app.use(express.json());

// Serve all HTML files and static assets from the project root
app.use(express.static(__dirname));

// Initialize Gemini
let ai;
try {
    // Requires GEMINI_API_KEY in the environment
    ai = new GoogleGenAI({});
} catch (error) {
    console.warn("API Key might be missing or invalid. Ensure GEMINI_API_KEY is in .env");
}

// System Prompt constraint for our UGC Ad Creator persona
const getSystemPrompt = () => `
Role: You are an expert viral UGC (User Generated Content) media creator.
Task: Write a script for a short-form video ad.
Constraint: Avoid "ad" words like 'unbeatable', 'offer', 'revolutionary'. Be authentic.
Voice: Use colloquialisms. Sound like an honest customer review.
Format: Return exactly a JSON object with three keys: "hook", "bridge", and "close". 
Do NOT include markdown formatting or backticks around the JSON. Return purely the raw JSON object.
`;

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token." });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required." });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "User already exists." });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: { email, passwordHash: hash, generation_count: 0 }
        });

        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Server error during registration." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required." });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "Invalid credentials." });

        const validPassword = await bcrypt.compare(password, user.passwordHash || "");
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials." });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Server error during login." });
    }
});

app.post('/api/generate', authenticateToken, async (req, res) => {
    try {
       const { niche, painPoint, heroSolution, vibe, localAnchor } = req.body;
       const userDbReq = req.user.id;

        if (!ai || !process.env.GEMINI_API_KEY) {
             return res.status(500).json({ error: "AI not configured. Missing GEMINI_API_KEY in .env." });
        }

        // 1. Create a Campaign record
        const campaign = await prisma.campaign.create({
            data: {
               user_id: userDbReq,
               niche: niche || "unknown",
               pain_point: painPoint || "unknown",
               hero_solution: heroSolution || "unknown",
               vibe: vibe || "unknown",
               local_anchor: localAnchor || "unknown"
            }
        });

        const prompt = `
Write a UGC script using these details:
Business Niche: ${niche}
Customer Pain Point: ${painPoint}
The Hero Solution: ${heroSolution}
Vibe/Aesthetic: ${vibe}
Local Area: ${localAnchor}

Structure:
Hook (0-3s): Visual pattern interrupt + addressing the pain point.
Bridge (3-20s): Personal story using the hero solution specifically mentioning the vibe and niche.
Close (20-30s): Soft Call To Action mentioning the local area.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: getSystemPrompt(),
                responseMimeType: "application/json",
            }
        });

        const textResponse = response.text;
        const parsed = JSON.parse(textResponse);
        
        // 2. Save the Script directly to the DB
        const script = await prisma.script.create({
            data: {
                campaign_id: campaign.id,
                content: JSON.stringify(parsed),
                is_refined: false,
                version: 1
            }
        });

        // 3. Update User stats
        await prisma.user.update({
             where: { id: userDbReq },
             data: { generation_count: { increment: 1 } }
        });

        res.json({
            success: true,
            script: parsed,
            campaign_id: campaign.id,
            script_id: script.id
        });

    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: "Failed to generate script", details: error.message });
    }
});

app.post('/api/refine', authenticateToken, async (req, res) => {
    try {
        const { originalScript, vars, instruction, campaignId } = req.body;
        
        if (!ai || !process.env.GEMINI_API_KEY) {
             return res.status(500).json({ error: "AI not configured. Missing GEMINI_API_KEY in .env." });
        }

        const prompt = `
Here is an existing UGC script:
Hook: ${originalScript.hook}
Bridge: ${originalScript.bridge}
Close: ${originalScript.close}

Variables used in original generation:
Niche: ${vars.niche}
Pain Point: ${vars.painPoint}
Hero Solution: ${vars.heroSolution}
Vibe: ${vars.vibe}
Local Area: ${vars.localAnchor}

Please refine and rewrite this script. ${instruction ? `Specific instruction: ${instruction}` : 'Make it sound fresh, engaging, and slightly different from the original.'}
Remember to keep the same structure and purely return the JSON structure for hook, bridge, and close.
`;

        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: prompt,
             config: {
                 systemInstruction: getSystemPrompt(),
                 responseMimeType: "application/json",
             }
        });

        const textResponse = response.text;
        const parsed = JSON.parse(textResponse);
        
        // Find latest version if campaignId exists
        let newVersionId = 1;
        if (campaignId) {
            const lastScript = await prisma.script.findFirst({
                where: { campaign_id: campaignId },
                orderBy: { version: 'desc' }
            });
            if (lastScript) {
                 newVersionId = lastScript.version + 1;
            }
            
            await prisma.script.create({
                data: {
                    campaign_id: campaignId,
                    content: JSON.stringify(parsed),
                    is_refined: true,
                    version: newVersionId
                }
            });
        }

        res.json({
            success: true,
            script: parsed
        });

    } catch (error) {
        console.error("Refinement Error:", error);
        res.status(500).json({ error: "Failed to refine script", details: error.message });
    }
});

// GET History Route
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const campaigns = await prisma.campaign.findMany({
            where: { user_id: userId },
            include: {
                scripts: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            },
            orderBy: { created_at: 'desc' }
        });
        
        res.json({ success: true, campaigns });
    } catch(err) {
        console.error("History Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

app.get('/api/profile-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        let anonUser = await prisma.user.findUnique({ where: { id: userId }, include: { _count: { select: { campaigns: true } } } });
        if (!anonUser) {
             return res.json({ success: true, campaigns_cnt: 0, generations_cnt: 0 });
        }
        res.json({ success: true, campaigns_cnt: anonUser._count.campaigns, generations_cnt: anonUser.generation_count, email: anonUser.email });
    } catch(err) {
        console.error("Profile Error:", err);
        res.status(500).json({ error: "Failed to fetch profile info" });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
        console.log("Ready to handle /api/generate and /api/refine requests!");
    });
}
module.exports = app;
