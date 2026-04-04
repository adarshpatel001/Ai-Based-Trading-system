# AI Assisted Trading Learning Platform

This project is a paper-trading platform with live market data, AI-based decision support, and a React dashboard. Users can practice trading with virtual capital, inspect live charts, view AI recommendations, and simulate both US and Indian market trades without real financial risk.

## Architecture

- `frontend/`
  - React + Vite dashboard
  - Landing page, auth flow, live market view, candlestick chart, portfolio, orders
- `server/`
  - Node.js + Express + MongoDB application backend
  - Authentication, wallet, paper trading, portfolio, AI orchestration
- `backend/`
  - FastAPI market data service
  - Live stream handling, quote snapshots, candles, market endpoints
- `ai-service/`
  - FastAPI AI microservice
  - Simple indicator-based recommendation engine (`BUY`, `HOLD`, `AVOID`)

## Main Features

- User registration and login with JWT auth
- USD-based virtual wallet
- Paper trading for stocks
- Live quote and candle data
- Support for US and Indian symbols
- FX conversion for non-USD instruments
- AI recommendation flow based on recent candles and indicators
- Candlestick chart with hover tooltip, timestamps, and crosshair

## Project Structure

```text
GetStocks data/
├── frontend/
├── server/
├── backend/
├── ai-service/
└── README.md
```

## Prerequisites

- Node.js
- Python 3
- MongoDB running locally

## Environment Setup

Create `server/.env` based on `server/.env.example`.

Example:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/trading_sim
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://127.0.0.1:8001
MARKET_SERVICE_URL=http://127.0.0.1:8000
CLIENT_ORIGIN=http://localhost:5173
```

## Install Dependencies

### Frontend

```bash
cd frontend
npm install
```

### Node backend

```bash
cd server
npm install
```

### Python market service

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn yfinance
```

### Python AI service

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run the Project

Open four terminals.

### 1. MongoDB

Start MongoDB locally if it is not already running.

### 2. Market data service

```bash
cd "/Users/nitishmac/Documents/Web Development/GetStocks data/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 3. AI service

```bash
cd "/Users/nitishmac/Documents/Web Development/GetStocks data/ai-service"
source .venv/bin/activate
uvicorn main:app --reload --port 8001
```

### 4. Node backend

```bash
cd "/Users/nitishmac/Documents/Web Development/GetStocks data/server"
npm run dev
```

### 5. Frontend

```bash
cd "/Users/nitishmac/Documents/Web Development/GetStocks data/frontend"
npm run dev
```

Open:

```text
http://localhost:5173
```

## API Overview

### Node backend

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/market/:symbol/quote`
- `GET /api/market/:symbol/candles`
- `GET /api/trade/wallet`
- `POST /api/trade/wallet/top-up`
- `GET /api/trade/portfolio`
- `GET /api/trade/orders`
- `POST /api/trade/orders`
- `POST /api/ai/analyze`
- `GET /api/ai/recommendations`

### Market service

- `GET /`
- `GET /quote/{symbol}`
- `GET /quotes?symbols=AAPL,MSFT`
- `GET /candles/{symbol}?limit=60`
- `WS /ws/{symbol}`

### AI service

- `GET /health`
- `POST /analyze`

## How the Data Flow Works

1. Frontend sends requests to the Node backend.
2. Node backend handles auth, wallet, portfolio, and trade logic.
3. Node backend fetches market data from the FastAPI market service.
4. Node backend sends quote + candles to the AI service for recommendations.
5. AI service returns signal, confidence, and reasoning.
6. Frontend displays market data, simulated trades, and AI suggestions.

## Notes

- This project is for simulation only.
- AI output is decision support, not financial advice.
- Market data quality depends on the upstream provider and market session availability.
- Indian stocks are displayed in INR, while wallet accounting is maintained in USD.

## Useful Symbols

- `AAPL`
- `MSFT`
- `NVDA`
- `GOOGL`
- `RELIANCE.NS`
- `^NSEI`

## Future Improvements

- Persist user watchlists in MongoDB
- Improve AI model with more indicators and better prompts
- Video Courses for Theoratical knowledge of Stock Market.
- ChatBot Integration for user related queries.
- Add admin tools and monitoring
