# 🧙 Sage - AI-Powered Financial Management Platform

Sage is a full-stack financial management application that combines real-time transaction tracking with AI-powered insights, predictive analytics, and intelligent spending analysis.

## ✨ Features

### Core Functionality

- **Real-time Transaction Tracking** - Import, categorize, and monitor all financial transactions
- **AI Financial Oracle** - Predict future spending patterns with scenario simulation
- **Anomaly Detection** - Automatically identify unusual spending patterns using statistical analysis
- **Budget Management** - Set and track weekly, biweekly, and monthly budgets
- **Interactive Dashboard** - Visualize spending trends, category breakdowns, and net cash flow
- **Multi-AI Integration** - Chat with AI assistants powered by Claude, GPT, Gemini, and more

### Advanced Features

- Machine learning predictions using Amazon Chronos time-series model
- What-if scenario analysis (skip expenses, add new expenses, reduce spending)
- Real-time anomaly alerts with IQR-based detection
- CSV transaction import and processing
- Dark/light mode support
- Responsive enterprise-grade UI

## 🛠️ Tech Stack

### Frontend

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** React hooks + Convex real-time queries
- **Charts:** Recharts + D3.js
- **UI Components:** Radix UI, Framer Motion, Lucide Icons
- **Auth:** Better Auth

### Backend

- **API Server:** Python Flask
- **ML/Data Processing:** PyTorch, Pandas, NumPy
- **Time-Series Forecasting:** Amazon Chronos
- **Database:** Convex (serverless)

### AI Integrations

- Anthropic Claude
- OpenAI GPT
- Google Gemini
- Groq
- DeepSeek

## 📁 Project Structure

```
sage/
├── client/                      # Frontend Next.js application
│   ├── app/
│   │   ├── (pages)/
│   │   │   └── dashboard/       # Main dashboard pages
│   │   │       ├── import/      # CSV import page
│   │   │       ├── oracle/      # AI predictions page
│   │   │       ├── sage/        # AI chat interface
│   │   │       └── settings/    # User settings
│   │   ├── api/                 # API routes
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── components/              # Reusable React components
│   │   └── ui/                  # shadcn/ui components
│   ├── convex/                  # Convex backend functions
│   │   ├── transactions.ts      # Transaction queries/mutations
│   │   ├── users.ts             # User management
│   │   └── _generated/          # Auto-generated Convex types
│   ├── lib/                     # Utility functions
│   ├── hooks/                   # Custom React hooks
│   ├── public/                  # Static assets
│   └── package.json
│
└── server/                      # Python backend
    ├── api/
    │   └── routes/
    │       ├── predictions.py   # ML prediction endpoints
    │       ├── anomalies.py     # Anomaly detection endpoint
    │       └── health.py        # Health check
    ├── predictors/
    │   └── chronos_predictor.py # Time-series prediction model
    ├── services/
    │   └── anomaly_detector.py  # Anomaly detection service
    ├── app.py                   # Flask application entry point
    └── requirements.txt         # Python dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Convex account (free tier available)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/sage.git
cd sage
```

### 2. Setup Frontend

```bash
cd client

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Convex
CONVEX_DEPLOYMENT=your_convex_deployment_url
NEXT_PUBLIC_CONVEX_URL=your_public_convex_url

# Better Auth
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000

# AI Provider Keys (optional - add the ones you want to use)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key
DEEPSEEK_API_KEY=your_deepseek_key
```

### 3. Setup Convex

```bash
# Install Convex CLI globally
npm install -g convex

# Initialize Convex (follow prompts)
npx convex dev
```

### 4. Setup Python Backend

```bash
cd ../server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `server/.env`:

```env
CONVEX_URL=your_convex_url
MODEL_TYPE=chronos  # or 'lstm'
FLASK_ENV=development
```

### 5. Run the Application

**Terminal 1 - Frontend:**

```bash
cd client
npm run dev
```

Frontend runs at `http://localhost:3000`

**Terminal 2 - Convex:**

```bash
cd client
npx convex dev
```

**Terminal 3 - Python Backend:**

```bash
cd server
python app.py
```

Backend runs at `http://localhost:8000`

### 6. Import Sample Data

1. Navigate to `http://localhost:3000/dashboard/import`
2. Place a CSV file named `transactions.csv` in `client/public/`
3. Click "Import All Transactions from CSV"
4. Wait for import to complete

CSV format:

```csv
id,transaction_id,date,time,activity,amount,category,type,vendor_name
1,12345,2024-01-15,14:30:00,Purchase,45.50,food_and_drink,debit,Starbucks
```

## 📊 Usage

### Dashboard

- View spending overview with total income, expenses, and net cash flow
- See recent transactions with pagination
- View category breakdown with percentages
- Check anomaly alerts for unusual spending

### Oracle (Predictions)

- Select time period (weekly/biweekly/monthly)
- Configure what-if scenarios:
  - Skip an expense category
  - Add a new recurring expense
  - Reduce spending in a category
- View predicted spending with/without changes
- Interactive charts showing forecast comparison

### Sage (AI Chat)

- Ask questions about your finances
- Get spending insights and recommendations
- Natural language interaction with your transaction data

### Settings

- Configure budget alerts
- Set weekly/biweekly/monthly spending limits
- Manage account preferences

## 🔧 Configuration

### Available AI Models

Configure in your chat interface settings:

- **Claude Sonnet 4.5** (Anthropic) - Best overall
- **GPT-4** (OpenAI) - Strong reasoning
- **Gemini Pro** (Google) - Fast and capable
- **Llama 3 70B** (Groq) - Fast, open-source
- **DeepSeek V3** - Cost-effective

### ML Model Selection

Edit `server/.env`:

- `MODEL_TYPE=chronos` - Pretrained time-series (recommended, no training needed)
- `MODEL_TYPE=lstm` - Custom LSTM (requires training)

## 📝 API Endpoints

### Python Backend (`http://localhost:8000`)

**Predictions**

- `POST /api/oracle/predict_params` - Get spending predictions with scenario parameters
- `POST /api/oracle/predict` - Simple prediction endpoint

**Anomalies**

- `POST /api/anomalies/detect` - Detect spending anomalies

**Health**

- `GET /api/health` - Server health check

### Convex Functions

- `transactions:getTransactionsByUser` - Get user transactions
- `transactions:addTransaction` - Add new transaction
- `users:getUserById` - Get user details
- `importTransactions:importTestTransaction` - Import transaction

## 🎨 UI Components

Built with shadcn/ui:

- `Card`, `Button`, `Input`, `Select`
- `Collapsible`, `Tabs`, `Dialog`
- `Chart` (Recharts integration)
- Custom `TransactionGraphs` component

## 🔒 Security

- Secure authentication with Better Auth
- Environment variable protection
- CORS configuration for API security
- SQL injection prevention
- XSS protection with React

## 🚧 Development

### Build for Production

**Frontend:**

```bash
cd client
npm run build
npm run start
```

**Backend:**

```bash
cd server
# Use production WSGI server like gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Linting

```bash
cd client
npm run lint
```

### Type Checking

```bash
cd client
npx tsc --noEmit
```

## 📈 Performance

- Incremental pagination for large datasets (10 items/load)
- React Server Components for optimal loading
- Lazy loading for charts and heavy components
- Efficient Convex queries with indexes
- Turbopack for fast development builds

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Amazon Chronos](https://github.com/amazon-science/chronos-forecasting) for time-series predictions
- [Convex](https://convex.dev) for real-time database
- [shadcn/ui](https://ui.shadcn.com) for beautiful components
- [Better Auth](https://www.better-auth.com) for authentication
- [Vercel](https://vercel.com) for Next.js framework

## 📞 Support

For issues and questions:

- Documentation: See `/docs` folder for detailed guides

---
