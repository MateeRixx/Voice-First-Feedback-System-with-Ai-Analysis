<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366F1,100:06B6D4&height=200&section=header&text=TrueTone&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Voice-First%20AI%20Feedback%2C%20Turned%20Into%20Action&descAlignY=55&descSize=18" width="100%" alt="TrueTone banner"/>

<a href="#-overview"><img src="https://readme-typing-svg.demolab.com/?lines=Speak.+We+transcribe.+AI+finds+the+signal.;Feedback+that+takes+5+seconds+to+give.;Built+for+Hindi+%2B+English+speakers.&font=Fira%20Code&size=20&pause=1500&color=6366F1&center=true&vCenter=true&width=600&height=40" alt="typing animation"/></a>

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-2C3E50?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)

[![Live Demo](https://res.cloudinary.com/dujqqwfym/image/upload/v1784550708/Screenshot_2026-07-20_180034_c04ksu.png)](#)
[![License](https://img.shields.io/badge/License-Portfolio-blue?style=for-the-badge)](#-license)
[![Stars](https://img.shields.io/github/stars/your-username/truetone?style=for-the-badge&color=yellow)](#)

</div>

<br/>

## 📍 Overview

> **TrueTone turns a 5-second voice note into a structured, actionable insight — no typing, no forms, no friction.**

Businesses lose feedback because forms are boring and nobody fills them out. TrueTone fixes that: a customer scans a QR code, speaks for a few seconds, and walks away. Behind the scenes, TrueTone transcribes the audio, runs it through AI for sentiment/urgency/theme detection, and drops a clean, searchable insight into a live dashboard — often before the customer has even left the building.

<details>
<summary><b>🇮🇳 Padhein Hinglish mein</b></summary>
<br/>

TrueTone ek aisa system hai jo **bolke diya gaya feedback** ko automatically actionable insight mein badal deta hai. Customer QR code scan karta hai, apni baat bolta hai — bas 5 second mein — aur chala jaata hai. Baaki ka kaam TrueTone khud karta hai: audio ko text mein convert karna, AI se sentiment/urgency/themes nikalna, aur ek clean dashboard pe show karna. Koi form fill karne ki zaroorat nahi, isliye response rate bhi kaafi zyada hota hai.

</details>

<br/>

### Why teams use it

| | |
|---|---|
| 🗣️ **Zero-friction input** | Speaking is 3x faster than typing — response rates go up because there's nothing to fill out |
| 🌐 **Hindi + English native** | Built for real Indian users, not just English-first markets |
| ⚡ **Insight, not raw data** | You get sentiment, urgency, and themes — not a pile of audio files to sift through |
| 🏢 **Multi-tenant from day one** | Every organization's data is isolated, auditable, and secure |

<details>
<summary><b>🇮🇳 Padhein Hinglish mein</b></summary>
<br/>

- **Zero-friction input** — bolna, type karne se kaafi fast hai, isliye zyada log respond karte hain
- **Hindi + English native** — real Indian users ke liye banaya gaya hai
- **Insight, not raw data** — aapko sentiment, urgency, aur themes milte hain, na ki sirf audio files ka dhair
- **Multi-tenant from day one** — har organization ka data alag aur secure rehta hai

</details>

<br/>

## 🖥️ See It In Action

<div align="center">
<img src="https://res.cloudinary.com/dujqqwfym/image/upload/v1784550904/Screenshot_2026-07-20_180451_jajtgg.png" width="80%" alt="TrueTone dashboard screenshot"/>
</div>

<br/>

## 🏗️ Architecture

```mermaid
flowchart TD

A[User Browser] --> B[React 19 + Vite]
B --> C[Express API]
C --> D[(Neon PostgreSQL)]
C --> E[Cloudinary]
C --> F[pg-boss Queue]
F --> G[Worker]
G --> H[Sarvam AI]
G --> I[OpenRouter LLM]
H --> J[Transcript]
I --> K[Sentiment Analysis]
J --> L[Dashboard]
K --> L
```

<details>
<summary><b>🇮🇳 Architecture Hinglish mein samjhein</b></summary>
<br/>

User apne browser se React app (Vite pe chal raha hai) kholta hai aur apna voice response record karta hai. Ye request Express API ke paas jaati hai, jo audio ko Cloudinary pe store karta hai aur ek background job create karta hai pg-boss queue mein. Ek separate Worker process is job ko pick karta hai — pehle Sarvam AI se speech-to-text transcript nikalta hai, phir OpenRouter LLM se sentiment aur themes detect karta hai. Final result Neon PostgreSQL database mein save hota hai aur dashboard pe turant reflect hota hai.

</details>

<br/>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

**🎤 Voice Collection**
- Browser-based recording, no app install
- Live waveform visualization
- Native Hindi + English support

**🤖 AI Processing**
- Automatic transcription
- Sentiment & urgency detection
- Theme extraction + AI summary
- Actionable recommendations

</td>
<td width="50%" valign="top">

**📊 Dashboard**
- Survey management
- Full response history
- Sentiment & theme charts
- Executive summary view

**🔐 Security**
- JWT auth + bcrypt hashing
- Multi-tenant org isolation
- Rate limiting

</td>
</tr>
</table>

<details>
<summary><b>🇮🇳 Features Hinglish mein</b></summary>
<br/>

- **Voice Collection** — browser mein hi recording ho jaati hai, koi app install nahi karna; Hindi aur English dono support karta hai
- **AI Processing** — transcription, sentiment, urgency, themes, aur summary sab automatic
- **Dashboard** — surveys manage karo, response history dekho, charts ke through insights samjho
- **Security** — JWT auth, password hashing, aur har organization ka data alag-alag secure rehta hai

</details>

<br/>

## 🛠️ Tech Stack

<div align="center">
<img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,express,prisma,postgres,nodejs&theme=dark" alt="tech stack icons"/>
</div>

<br/>

<table>
<tr>
<th>Layer</th>
<th>Stack</th>
</tr>
<tr>
<td><b>Frontend</b></td>
<td>React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · React Router v7 · Recharts · WaveSurfer.js</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>Express.js · TypeScript · Prisma ORM · PostgreSQL · pg-boss · JWT · bcrypt · Zod</td>
</tr>
<tr>
<td><b>External Services</b></td>
<td>Cloudinary (storage) · Sarvam AI (speech-to-text) · OpenRouter (LLM analysis)</td>
</tr>
</table>

<br/>

## 🌐 Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon PostgreSQL |
| Storage | Cloudinary |
| Queue | pg-boss |
| AI | Sarvam AI + OpenRouter |

<div align="center">
<sub>Runs end-to-end on free tiers — zero infra cost to demo or fork.</sub>
</div>

<br/>

## 📊 Database Design

```mermaid
erDiagram

ORGANIZATION ||--o{ USER : owns
ORGANIZATION ||--o{ SURVEY : has
SURVEY ||--o{ SURVEY_RESPONSE : receives
SURVEY_RESPONSE ||--|| TRANSCRIPT : contains
SURVEY_RESPONSE ||--|| RESPONSE_ATTACHMENT : stores
SURVEY_RESPONSE ||--|| AI_INSIGHT : generates
```

Design highlights: Prisma ORM · `cuid()` IDs · JSON fields for flexible AI output · atomic transactions · enum constraints for data integrity.

<br/>

## 🔄 Processing Flow

```mermaid
sequenceDiagram

participant User
participant API
participant Queue
participant Worker
participant AI

User->>API: Submit Voice Response
API->>Cloudinary: Upload Audio
API->>Queue: Create Job
Queue->>Worker: Start Processing
Worker->>AI: Speech To Text
AI-->>Worker: Transcript
Worker->>AI: Analyze Transcript
AI-->>Worker: Sentiment + Themes
Worker->>API: Save Results
API-->>User: Processing Complete
```

<br/>

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/truetone.git
cd truetone

# Install dependencies
cd client && npm install
cd ../server && npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start the app
npm run dev        # server
cd ../client && npm run dev   # client
```

<details>
<summary><b>🇮🇳 Setup Hinglish mein</b></summary>
<br/>

1. Repo clone karo aur usme jao
2. `client` aur `server` dono folders mein `npm install` chalao
3. `.env.example` ko copy karke `.env` banao aur apni keys daalo (Cloudinary, Sarvam, OpenRouter, database URL)
4. `npx prisma migrate dev` se database tables create ho jaayenge
5. Server aur client dono `npm run dev` se start kar do — bas ho gaya

</details>

<br/>

## 📂 Project Structure

```text
client/
├── src/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── lib/

server/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── workers/
│   ├── lib/
│   │   ├── process-response.ts
│   │   ├── sarvam.ts
│   │   └── openrouter.ts
│   └── app.ts
```

<br/>

## 🗺️ Roadmap

- [ ] WhatsApp-based feedback submission
- [ ] Configurable alert rules for negative feedback
- [ ] Export insights to CSV / PDF
- [ ] Multi-language support beyond Hindi/English

<br/>

## 🤝 Contributing

Issues and PRs are welcome — this started as a portfolio project but it's built to be extended. Open an issue before a large PR so the direction can be discussed first.

<br/>

## 📜 License

This project is intended for educational and portfolio purposes.

<br/>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06B6D4,100:6366F1&height=120&section=footer" width="100%" alt="footer"/>

**Turning conversations into actionable insights, one voice note at a time.**

</div>
