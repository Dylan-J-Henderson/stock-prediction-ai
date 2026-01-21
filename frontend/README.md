# Stock Prediction AI Application

A full-stack application for predicting stock prices using multiple AI models including Neural Prophet, LSTM, ARIMA, Facebook Prophet, and Linear Regression.

## Features

- **Real-time Price Updates**: Fetches current stock prices every second (Finnhub free tier: 60 req/min)
- **Multiple AI Models**: Choose from 5 different prediction algorithms
- **Smart Caching**: Historical data is cached to minimize API calls
- **Adjustable Predictions**: Set prediction horizon from 7 to 90 days
- **Live Updates**: Cached data is continuously updated with current prices
- **Interactive Charts**: Visualize historical data and predictions

## Architecture

### Frontend (React)
- Real-time price polling (1 second intervals)
- Efficient data caching in memory
- Responsive UI with Recharts for visualization
- Tailwind CSS styling

### Backend (Python/FastAPI)
- Finnhub API integration for stock data
- Multiple AI/ML prediction models
- RESTful API endpoints
- CORS enabled for local development

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- Finnhub API key (free tier: https://finnhub.io/)

### Backend Setup

1. **Create a virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Set your Finnhub API key**:
```bash
# Linux/Mac
export FINNHUB_API_KEY="your_api_key_here"

# Windows
set FINNHUB_API_KEY=your_api_key_here
```

Or edit `app.py` and replace `"your_api_key_here"` with your actual API key.

4. **Run the backend**:
```bash
python app.py
```

The API will start on `http://localhost:8000`

### Frontend Setup

1. **Create React app** (if starting fresh):
```bash
npx create-react-app stock-prediction-frontend
cd stock-prediction-frontend
```

2. **Install dependencies**:
```bash
npm install recharts lucide-react
```

3. **Replace `src/App.js`** with the React component code provided

4. **Start the development server**:
```bash
npm start
```

The app will open at `http://localhost:3000`

## API Endpoints

### GET `/current-price/{symbol}`
Fetches real-time stock price
- **Response**: `{price, change, percent_change, timestamp}`

### GET `/historical/{symbol}`
Fetches 1 year of historical data
- **Response**: `{symbol, historical: [{date, open, high, low, close, volume}]}`

### POST `/predict`
Generates predictions using selected model
- **Body**: `{symbol, model, days, historical}`
- **Response**: `{symbol, model, predictions: [{date, close}]}`

## AI Models

1. **Neural Prophet**: Advanced neural network-based time series forecasting
2. **LSTM**: Long Short-Term Memory neural network (simplified)
3. **ARIMA**: AutoRegressive Integrated Moving Average
4. **Facebook Prophet**: Additive regression model for time series
5. **Linear Regression**: Simple trend-based prediction

## Optimization Features

### Caching Strategy
- Historical data is cached per symbol in memory
- Cache is only refreshed when user clicks "Predict"
- Current price updates don't trigger new API calls for historical data

### Rate Limiting
- Current price: 1 request/second (60/minute, within free tier)
- Historical data: Cached, minimal requests
- Predictions: Computed locally after initial data fetch

### Performance
- React refs for cache to avoid re-renders
- Efficient data updates without full re-fetches
- Minimal re-computation of predictions

## Usage

1. Enter a stock symbol (e.g., AAPL, TSLA, MSFT)
2. Select an AI model from the dropdown
3. Adjust the prediction horizon slider (7-90 days)
4. Click "Predict" to generate forecasts
5. Watch real-time price updates in the status bar

## Free Tier Limitations (Finnhub)

- 60 API calls per minute
- 30 API calls per second
- No extended hours data
- Limited to major exchanges

The app is optimized to work within these limits through caching and efficient polling.

## Troubleshooting

**Backend won't start**:
- Ensure all dependencies are installed
- Check Python version (3.8+)
- Verify API key is set correctly

**No predictions showing**:
- Check backend is running on port 8000
- Verify stock symbol is valid
- Check browser console for errors

**Rate limit errors**:
- Wait a minute before retrying
- Ensure only one instance is running
- Check API key is valid

## Future Enhancements

- Add more sophisticated LSTM/GRU models with TensorFlow
- Implement ensemble predictions (combining multiple models)
- Add technical indicators (RSI, MACD, Bollinger Bands)
- Support for multiple symbols simultaneously
- Database persistence for historical data
- WebSocket for real-time updates
- Backtesting capabilities
