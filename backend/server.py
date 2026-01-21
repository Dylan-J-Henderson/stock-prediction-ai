from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import finnhub
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict
import os

# AI/ML Imports
try:
    from neuralprophet import NeuralProphet
except ImportError:
    NeuralProphet = None

try:
    from prophet import Prophet
except ImportError:
    Prophet = None

from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Finnhub client
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d5of0v9r01qjast6bkp0d5of0v9r01qjast6bkpg")
finnhub_client = finnhub.Client(api_key=FINNHUB_API_KEY)

class PredictionRequest(BaseModel):
    symbol: str
    model: str
    days: int
    historical: List[Dict]

@app.get("/")
def read_root():
    return {"status": "Stock Prediction API Running"}

@app.get("/current-price/{symbol}")
async def get_current_price(symbol: str):
    """Get real-time stock price"""
    try:
        quote = finnhub_client.quote(symbol)
        return {
            "symbol": symbol,
            "price": quote['c'],  # current price
            "change": quote['d'],  # change
            "percent_change": quote['dp'],  # percent change
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/historical/{symbol}")
async def get_historical_data(symbol: str):
    """Get historical stock data (1 year)"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        # Convert to Unix timestamp
        start_ts = int(start_date.timestamp())
        end_ts = int(end_date.timestamp())
        
        # Fetch candle data
        res = finnhub_client.stock_candles(
            symbol, 'D', start_ts, end_ts
        )
        
        if res['s'] != 'ok':
            raise HTTPException(status_code=404, detail="No data found")
        
        # Convert to list of dicts
        historical = []
        for i in range(len(res['t'])):
            historical.append({
                'date': datetime.fromtimestamp(res['t'][i]).strftime('%Y-%m-%d'),
                'open': res['o'][i],
                'high': res['h'][i],
                'low': res['l'][i],
                'close': res['c'][i],
                'volume': res['v'][i]
            })
        
        return {"symbol": symbol, "historical": historical}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def prepare_dataframe(historical: List[Dict]) -> pd.DataFrame:
    """Prepare DataFrame from historical data"""
    df = pd.DataFrame(historical)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    return df

def predict_neural_prophet(df: pd.DataFrame, days: int) -> List[Dict]:
    """Neural Prophet prediction"""
    if NeuralProphet is None:
        return predict_linear_regression(df, days)
    
    try:
        # Prepare data for NeuralProphet
        prophet_df = df[['date', 'close']].copy()
        prophet_df.columns = ['ds', 'y']
        
        # Train model
        model = NeuralProphet(
            n_forecasts=days,
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            epochs=50,
            learning_rate=0.01
        )
        
        model.fit(prophet_df, freq='D')
        
        # Make predictions
        future = model.make_future_dataframe(prophet_df, periods=days)
        forecast = model.predict(future)
        
        # Extract predictions
        predictions = []
        last_historical_date = df['date'].max()
        
        for idx, row in forecast.iterrows():
            pred_date = row['ds']
            if pred_date > last_historical_date:
                predictions.append({
                    'date': pred_date.strftime('%Y-%m-%d'),
                    'close': float(row['yhat1'])
                })
        
        return predictions[:days]
    except Exception as e:
        print(f"Neural Prophet error: {e}")
        return predict_linear_regression(df, days)

def predict_prophet(df: pd.DataFrame, days: int) -> List[Dict]:
    """Facebook Prophet prediction"""
    if Prophet is None:
        return predict_linear_regression(df, days)
    
    try:
        prophet_df = df[['date', 'close']].copy()
        prophet_df.columns = ['ds', 'y']
        
        model = Prophet(daily_seasonality=False)
        model.fit(prophet_df)
        
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)
        
        predictions = []
        last_date = df['date'].max()
        
        for idx, row in forecast.iterrows():
            if row['ds'] > last_date:
                predictions.append({
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'close': float(row['yhat'])
                })
        
        return predictions[:days]
    except Exception as e:
        print(f"Prophet error: {e}")
        return predict_linear_regression(df, days)

def predict_linear_regression(df: pd.DataFrame, days: int) -> List[Dict]:
    """Linear Regression prediction"""
    # Use last 60 days for training
    df_train = df.tail(60).copy()
    df_train['days'] = range(len(df_train))
    
    X = df_train[['days']].values
    y = df_train['close'].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict future
    last_day = len(df_train)
    future_days = np.array([[last_day + i] for i in range(1, days + 1)])
    predictions_values = model.predict(future_days)
    
    # Generate dates
    last_date = df['date'].max()
    predictions = []
    
    for i, pred in enumerate(predictions_values):
        pred_date = last_date + timedelta(days=i+1)
        predictions.append({
            'date': pred_date.strftime('%Y-%m-%d'),
            'close': float(pred)
        })
    
    return predictions

def predict_lstm(df: pd.DataFrame, days: int) -> List[Dict]:
    """LSTM prediction (simplified version)"""
    # Use exponential smoothing as a proxy
    prices = df['close'].values
    alpha = 0.3
    
    smoothed = [prices[0]]
    for i in range(1, len(prices)):
        smoothed.append(alpha * prices[i] + (1 - alpha) * smoothed[-1])
    
    # Predict future
    predictions = []
    last_date = df['date'].max()
    last_value = smoothed[-1]
    
    # Simple trend continuation
    trend = (smoothed[-1] - smoothed[-20]) / 20
    
    for i in range(days):
        pred_date = last_date + timedelta(days=i+1)
        pred_value = last_value + trend * (i + 1)
        predictions.append({
            'date': pred_date.strftime('%Y-%m-%d'),
            'close': float(pred_value)
        })
    
    return predictions

def predict_arima(df: pd.DataFrame, days: int) -> List[Dict]:
    """ARIMA-like prediction using moving average"""
    window = 20
    prices = df['close'].values
    
    # Calculate moving average
    ma = pd.Series(prices).rolling(window=window).mean()
    last_ma = ma.iloc[-1]
    
    # Simple trend
    trend = (prices[-1] - prices[-window]) / window
    
    predictions = []
    last_date = df['date'].max()
    
    for i in range(days):
        pred_date = last_date + timedelta(days=i+1)
        pred_value = last_ma + trend * (i + 1)
        predictions.append({
            'date': pred_date.strftime('%Y-%m-%d'),
            'close': float(pred_value)
        })
    
    return predictions

@app.post("/predict")
async def predict_stock(request: PredictionRequest):
    """Generate stock predictions using selected model"""
    try:
        df = prepare_dataframe(request.historical)
        
        if len(df) < 30:
            raise HTTPException(
                status_code=400, 
                detail="Insufficient historical data"
            )
        
        # Route to appropriate model
        if request.model == 'neural_prophet':
            predictions = predict_neural_prophet(df, request.days)
        elif request.model == 'prophet':
            predictions = predict_prophet(df, request.days)
        elif request.model == 'lstm':
            predictions = predict_lstm(df, request.days)
        elif request.model == 'arima':
            predictions = predict_arima(df, request.days)
        elif request.model == 'linear_regression':
            predictions = predict_linear_regression(df, request.days)
        else:
            raise HTTPException(status_code=400, detail="Invalid model")
        
        return {
            "symbol": request.symbol,
            "model": request.model,
            "predictions": predictions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)