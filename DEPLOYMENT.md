# PrivCloud Production Deployment Guide

Deploying the **PrivCloud Backend** on **Render** (via automated Blueprint) and the **PrivCloud Frontend** on **Vercel** (Global Edge CDN).

---

## Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              PrivCloud Users                 │
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
                                              │  PostgreSQL/Auth│             │ Payment Gateway │
                                              └─────────────────┘             └─────────────────┘
```

---

## Part 1: Deploy Backend to Render (via Blueprint)

The repository includes a ready-to-use Render Blueprint file: [`render.yaml`](./render.yaml).

### Step 1: Open Render Blueprints
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right and select **Blueprint**.
3. Connect your GitHub account and select your repository (`chandanraj-03/homepage`).
4. Select the branch you want to deploy (e.g., `fix/windows-ui-upgrade-email-fixes` or `main`).

### Step 2: Configure Environment Variables
Render will detect `render.yaml` and ask you to populate any environment variables marked `sync: false`:

| Variable | Description | Example / Location |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` (Supabase Settings -> API) |
| `SUPABASE_KEY` | Supabase publishable anon key | `sb_publishable_...` (Supabase Settings -> API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret key | `sb_secret_...` (Supabase Settings -> API) |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_live_...` or `rzp_test_...` (Razorpay Dashboard) |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | `...` (Razorpay Dashboard -> API Keys) |
| `ALLOWED_ORIGINS` | Permitted frontend origins | `https://*.vercel.app,http://localhost:3000` |

> [!NOTE]
> The backend automatically permits all `https://*.vercel.app` domains via regex in CORS middleware, so preview and production Vercel builds will connect without CORS blocks.

### Step 3: Deploy
1. Click **Apply**.
2. Render will automatically:
   - Install Python dependencies via `pip install -r requirements.txt`
   - Start the ASGI server via `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
   - Monitor the health check at `/api/health`
3. Once live, copy your service URL (e.g., `https://privcloud-backend.onrender.com`).

---

## Part 2: Deploy Frontend to Vercel

The repository includes pre-configured Vercel configuration files:
- [`frontend/vercel.json`](./frontend/vercel.json): Used when Root Directory is set to `frontend`.
- [`vercel.json`](./vercel.json): Used when Root Directory is kept as the repository root.

### Step 1: Import Repository to Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`chandanraj-03/homepage`).

### Step 2: Configure Project Settings
1. **Framework Preset**: Select **Other**.
2. **Root Directory**:
   - **Recommended**: Click **Edit** and choose `frontend`.
   - *(Alternatively, leave it as `./` — the root `vercel.json` will automatically route to `/frontend` files).*
3. **Build & Development Settings**: Leave empty (this is a fast, zero-build Vanilla JS & HTML site).

### Step 3: Deploy
1. Click **Deploy**.
2. Vercel will deploy the site to an instant HTTPS URL (e.g., `https://privcloud-xxx.vercel.app`).

---

## Part 3: Connect Frontend to Render Backend

You have two simple ways to connect your Vercel frontend to the live Render backend:

### Option A: Set backendUrl in `frontend/config.js` (Easiest)
In [`frontend/config.js`](./frontend/config.js), paste your live Render URL:
```javascript
window.PRIVCLOUD_CONFIG = window.PRIVCLOUD_CONFIG || {
    backendUrl: "https://privcloud-backend.onrender.com",
    supabaseUrl: "https://qrxjyvezlotjwggtgoqe.supabase.co",
    supabaseKey: "sb_publishable_TBuxXwl_-StgMpP1deF7zw_2Z9izNgU"
};
```
Commit and push. Vercel will redeploy instantly.

### Option B: Transparent Vercel Rewrites (Zero-CORS Proxy)
If you prefer all API calls to route through your Vercel domain (`/api/*`), update the rewrites in `vercel.json`:
```json
{
  "source": "/api/:path*",
  "destination": "https://privcloud-backend.onrender.com/api/:path*"
}
```
All frontend calls to `/api/create-order`, `/api/chat`, etc., will be proxied by Vercel directly to Render.

---

## Part 4: Verification & Testing Checklist

Once deployed, verify the end-to-end flow:

1. **Backend Health Check**:
   - Open in browser: `https://<YOUR_RENDER_URL>/api/health`
   - Expect: `{"status": "healthy", "service": "PrivCloud Backend", "version": "3.0.0"}`
2. **Frontend Clean URLs**:
   - `https://<YOUR_VERCEL_URL>/` -> Displays Landing Page
   - `https://<YOUR_VERCEL_URL>/auth` -> Displays Login / Registration Page
   - `https://<YOUR_VERCEL_URL>/product` -> Displays Product Architecture Page
   - `https://<YOUR_VERCEL_URL>/purchase` -> Displays Pricing & Checkout Page
   - `https://<YOUR_VERCEL_URL>/demo` -> Displays Installation Guide & Video Demo
   - `https://<YOUR_VERCEL_URL>/feedback` -> Displays Feedback Page
3. **AI Chatbot**:
   - Click floating bot icon -> Send message "hello" -> Receive response from AI assistant.
4. **Razorpay Checkout**:
   - Go to `/purchase` -> Select a plan -> Verify checkout modal loads with your Razorpay Key ID.
