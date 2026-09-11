# PrivCloud — Self-Hosted Private Cloud Platform

<div align="center">

<img src="https://qrxjyvezlotjwggtgoqe.supabase.co/storage/v1/object/public/assets/logo.png" alt="PrivCloud Logo" width="160" />

### *My Cloud. My Data. My Control.*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment%20Gateway-02042B?style=for-the-badge&logo=razorpay&logoColor=00BAF2)](https://razorpay.com)
[![Render](https://img.shields.io/badge/Render-Backend%20Blueprint-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend%20Edge-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

A private, high-performance cloud platform engineered for **Windows 10 & 11**.  
PrivCloud turns your personal PC into an ultra-fast private cloud server — **eliminating recurring monthly storage subscriptions** while keeping your data 100% locally owned and encrypted.

[Features](#-key-features) • [Architecture](#-architecture) • [Tech Stack](#-technology-stack) • [Quickstart](#-getting-started) • [Deployment](#-production-deployment) • [API Specs](#-api-endpoints)

---

</div>

## 🌟 Key Features

- **🏠 100% Self-Hosted & Private**: Your files reside on your Windows machine. No corporate data scraping, no cloud storage leaks, no third-party scanning.
- **⚡ Zero Subscription Fees**: Own your cloud forever with lifetime licensing (Basic & Pro editions) or start with a full-featured 14-day evaluation trial.
- **🤖 Built-in RAG AI Assistant**: Integrated customer support & product guidance chatbot powered by Hybrid GitHub Retrieval-Augmented Generation (RAG).
- **💳 Automated Razorpay Checkout & Licensing**: Real-time order creation, constant-time HMAC-SHA256 signature verification, atomic product key provisioning from Supabase, and automated receipt emails.
- **🔐 Unified Authentication**: Dual-identifier login (Email or Username), passwordless OTP verification, email domain validation, and secure password reset powered by Supabase Auth.
- **🖥️ Native Windows Experience**: Dedicated desktop installer (`PrivCloud_Setup.exe`), native Windows UI showcase with authentic title bar controls, and low resource utilization.
- **📱 Responsive Glassmorphic Web Portal**: Vanilla JavaScript and modern CSS architecture without bulky framework overhead — fast, accessible, and mobile-ready.

---

## 🏗️ Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           PrivCloud Web & Mobile Users       │
                               └──────────────────────┬───────────────────────┘
                                                      │
                              ┌───────────────────────┴───────────────────────┐
                              │                                               │
                              ▼                                               ▼
                ┌───────────────────────────┐                   ┌───────────────────────────┐
                │      Frontend (Vercel)    │                   │      Backend (Render)     │
                │      Global Edge CDN      │                   │      FastAPI (Python)     │
                ├───────────────────────────┤                   ├───────────────────────────┤
                │ • Clean URL Rewrites      │  REST / CORS API  │ • Razorpay Order/Verify   │
                │ • Mobile Nav & Vanilla CSS│ ────────────────> │ • Supabase Auth Admin     │
                │ • Client-side Chatbot UI  │                   │ • Hybrid GitHub RAG Proxy │
                │ • Instant Asset Delivery  │                   │ • Auto-Healthchecks       │
                └───────────────────────────┘                   └─────────────┬─────────────┘
                                                                              │
                                                              ┌───────────────┴───────────────┐
                                                              ▼                               ▼
                                                     ┌─────────────────┐             ┌─────────────────┐
                                                     │    Supabase     │             │    Razorpay     │
                                                     │ PostgreSQL/Auth │             │ Payment Gateway │
                                                     └─────────────────┘             └─────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend Framework** | FastAPI (Python 3.11+) | Async ASGI server, modular routers, Pydantic schemas |
| **Server Engine** | Uvicorn + uvloop | High-concurrency production ASGI web server |
| **Database & Auth** | Supabase (PostgreSQL) | User credentials, order records, atomic product key assignment |
| **Payment Gateway** | Razorpay SDK | Automated rupee orders, cryptographic signature verification |
| **AI Assistant** | Hybrid GitHub RAG Service | Contextual AI chat with product docs and vector retrieval |
| **Frontend Core** | HTML5 + Vanilla JS (ES6+) | Blazing-fast client without build-step compilation overhead |
| **Styling** | Modular Vanilla CSS | Dark/light glassmorphic UI, responsive layouts, micro-animations |
| **Hosting** | Render (Backend) + Vercel (Frontend) | Auto-scaling backend blueprint and global CDN frontend delivery |

---

## 📁 Repository Structure

```
homepage/
├── backend/                        # FastAPI Application Core
│   ├── routers/                    # Modular Endpoint Handlers
│   │   ├── auth.py                 # User auth, registration, OTP, config
│   │   ├── chatbot.py              # Hybrid RAG chatbot proxy & health checks
│   │   ├── feedback.py             # Community suggestions & review storage
│   │   ├── pages.py                # Static HTML route handlers
│   │   ├── payments.py             # Razorpay order create, verify, licensing
│   │   └── support.py              # Support tickets and inquiries
│   ├── app.py                      # FastAPI entrypoint, CORS, static serving
│   ├── config.py                   # Centralized env config & client singletons
│   ├── schemas.py                  # Pydantic request/response models
│   ├── supabase_db.py              # Supabase PostgREST database layer
│   └── users_db.py                 # User profiles, OTP, and receipt dispatch
│
├── frontend/                       # Client-Side Application
│   ├── auth_page/                  # Unified Auth (Login / Register / OTP)
│   ├── demo_page/                  # Interactive Product Guide & Video Demo
│   ├── feedback_page/              # User Reviews, Ratings & Feature Voting
│   ├── landing_page/               # Modular Landing Page Components
│   │   ├── about/                  # Vision and benefits
│   │   ├── chatbot/                # PrivCloud AI Floating Chatbot Widget
│   │   ├── features/               # Windows UI Feature Showcase
│   │   ├── hero/                   # Hero section & CTA
│   │   └── overview/               # Performance and security cards
│   ├── product_page/               # Product Architecture & Technical Specs
│   ├── purchase_page/              # Pricing Plans, Razorpay & License Flow
│   ├── support_page/               # Help Center & Documentation Links
│   ├── config.js                   # Runtime frontend backend URL resolver
│   ├── index.html                  # Root landing page
│   ├── mobileNav.css / .js         # Responsive navigation & mobile menu
│   ├── supabaseClient.js           # Client-side Supabase SDK & API helper
│   └── vercel.json                 # Vercel configuration for frontend root
│
├── DEPLOYMENT.md                   # Full-scale Render + Vercel deployment guide
├── render.yaml                     # Render Blueprint specification for backend
├── requirements.txt                # Python backend dependencies
├── supabase_schema.sql             # Complete PostgreSQL database schema
└── vercel.json                     # Root Vercel configuration with rewrites
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** installed (`python --version`)
- **Git** installed
- A **Supabase** account (Free tier works great)
- A **Razorpay** account (Test or Live mode)

---

### Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/chandanraj-03/homepage.git
cd homepage
```

#### 2. Configure Environment Variables
Create a `.env` file in the project root:
```ini
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Supabase Database & Auth Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_publishable_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret

# Hybrid GitHub RAG AI Backend (Optional)
RAG_BACKEND_URL=https://hybrid-github-rag-backend.onrender.com

# Windows Installer Download Link
PRODUCT_DOWNLOAD_URL=https://your-project.supabase.co/storage/v1/object/public/assets/PrivCloud_Setup.exe

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:5001,http://127.0.0.1:5001,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500
```

#### 3. Install Python Dependencies
```bash
# Create and activate virtual environment (optional but recommended)
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

#### 4. Run the Local Development Server
```bash
python -m backend.app
```

The server will launch at **`http://localhost:5001`**:
- 🌐 **Web Portal**: [http://localhost:5001](http://localhost:5001)
- 📖 **Interactive Swagger API Docs**: [http://localhost:5001/docs](http://localhost:5001/docs)
- 📚 **ReDoc Specifications**: [http://localhost:5001/redoc](http://localhost:5001/redoc)
- ❤️ **Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 📡 API Endpoints

### 🔐 System & Health
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check (Render / Uptime monitors) |
| `GET` | `/api/config` | Public runtime configuration (Supabase keys, tiers) |

### 💳 Payments & Licensing
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/create-order` | Create an authenticated Razorpay rupee order |
| `POST` | `/api/verify-payment` | Verify HMAC-SHA256 signature, assign key, send receipt |
| `POST` | `/api/create-trial-order` | Provision an idempotent 14-day free trial license |
| `POST` | `/api/get-product-key` | Retrieve assigned product key for verified account |
| `POST` | `/api/download-product` | Securely access the Windows installer package |

### 🤖 AI Assistant (RAG)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat` | Send conversational prompt to RAG AI assistant |
| `GET` | `/api/chatbot/health` | Check health of upstream AI inference backend |

### 👤 Authentication & User Management
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/validate-email` | Validate email provider domain restrictions |
| `POST` | `/api/auth/check-username` | Verify real-time username uniqueness |
| `POST` | `/api/auth/resolve-identifier` | Resolve username or email to auth identity |
| `POST` | `/api/auth/register-profile` | Register public user profile record |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit confirmation code |
| `POST` | `/api/auth/update-password` | Update account password with administrative sync |

---

## 🚢 Production Deployment

PrivCloud is designed for zero-friction split deployment:

### 1. Deploy Backend to Render (via Blueprint)
The root [`render.yaml`](./render.yaml) automatically builds and orchestrates the backend:
1. Go to [Render Dashboard](https://dashboard.render.com) -> **New +** -> **Blueprint**.
2. Select repository `homepage` on branch `final` (or `main`).
3. Fill in secret environment variables when prompted (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
4. Click **Apply**. Render deploys `privcloud-backend` with automatic health checks at `/api/health`.

### 2. Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com) -> **Add New...** -> **Project**.
2. Import repository `homepage`.
3. Set **Root Directory** to `frontend` (or leave default root `.` — both are supported via dual `vercel.json`).
4. Click **Deploy**. Vercel launches the static site globally on Edge CDN.

### 3. Connect Frontend to Backend
- In [`frontend/config.js`](./frontend/config.js), set `backendUrl: "https://your-render-app.onrender.com"`, or use the transparent `/api/*` rewrites in [`vercel.json`](./vercel.json).

*For comprehensive details, review the [Production Deployment Guide (DEPLOYMENT.md)](./DEPLOYMENT.md).*

---

## 🔒 Security & Data Integrity

- **Constant-Time Cryptography**: Payment HMAC-SHA256 signatures are verified using `hmac.compare_digest` to prevent timing-attack exploits.
- **Path-Traversal Guards**: Static file serving rigorously normalizes paths and enforces strict boundary confinement within `frontend/`.
- **CORS Allowlist & Vercel Regex**: Prevents unauthorized domain cross-origin abuse while automatically facilitating Vercel preview & production domains.
- **Atomic Product Key Provisioning**: Product keys are reserved with transactional state checks to guarantee no key can ever be double-assigned.

---

## 📄 License

This project is proprietary software. All rights reserved.  
© 2026 **PrivCloud Development Team**. Unauthorized copying, modification, or distribution is strictly prohibited.
