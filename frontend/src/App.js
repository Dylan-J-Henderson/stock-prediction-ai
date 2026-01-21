import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, RefreshCw, Database } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function StockPredictionApp() {
  const [symbol, setSymbol] = useState('AAPL');
  const [model, setModel] = useState('neural_prophet');
  const [predictionDays, setPredictionDays] = useState(30);
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState('No cache');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  const priceIntervalRef = useRef(null);
  const historicalCacheRef = useRef({});

  // Fetch current price (60 req/min on free tier = every 1 second)
  const fetchCurrentPrice = async () => {
    try {
      const res = await fetch(`${API_BASE}/current-price/${symbol}`);
      const data = await res.json();
      if (data.price) {
        setCurrentPrice(data.price);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  };

  // Fetch historical data with caching
  const fetchHistoricalData = async () => {
    const cacheKey = `${symbol}_historical`;
    
    // Check cache first
    if (historicalCacheRef.current[cacheKey]) {
      setCacheStatus('Using cache');
      return historicalCacheRef.current[cacheKey];
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/historical/${symbol}`);
      const data = await res.json();
      
      // Cache the data
      historicalCacheRef.current[cacheKey] = data.historical;
      setCacheStatus('Cached');
      setLoading(false);
      
      return data.historical;
    } catch (err) {
      console.error('Historical fetch error:', err);
      setLoading(false);
      return [];
    }
  };

  // Fetch predictions
  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const historical = await fetchHistoricalData();
      
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          model,
          days: predictionDays,
          historical
        })
      });
      
      const data = await res.json();
      
      // Combine historical and predictions
      const combined = [
        ...historical.map(d => ({ ...d, type: 'historical' })),
        ...data.predictions.map(d => ({ ...d, type: 'prediction' }))
      ];
      
      setChartData(combined);
      setLoading(false);
    } catch (err) {
      console.error('Prediction error:', err);
      setLoading(false);
    }
  };

  // Update existing cached data with new price
  const updateCachedData = () => {
    if (currentPrice && chartData.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const updated = [...chartData];
      const todayIndex = updated.findIndex(d => d.date === today);
      
      if (todayIndex >= 0) {
        updated[todayIndex] = { ...updated[todayIndex], close: currentPrice };
      } else {
        // Add new data point
        updated.push({ date: today, close: currentPrice, type: 'historical' });
      }
      
      setChartData(updated);
    }
  };

  // Setup price polling
  useEffect(() => {
    fetchCurrentPrice();
    priceIntervalRef.current = setInterval(fetchCurrentPrice, 1000);
    
    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [symbol]);

  // Update cached data when current price changes
  useEffect(() => {
    updateCachedData();
  }, [currentPrice]);

  // Initial prediction fetch
  useEffect(() => {
    fetchPredictions();
  }, []);

  const handlePredict = () => {
    // Clear cache for this symbol to get fresh data
    delete historicalCacheRef.current[`${symbol}_historical`];
    setCacheStatus('Refreshing...');
    fetchPredictions();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      {/* Legal Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-2xl border-2 border-red-500/50 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold text-red-400">Important Legal Disclaimer</h2>
            </div>
            
            <div className="space-y-4 text-gray-300 mb-6">
              <p className="text-lg font-semibold text-white">
                This website is for EDUCATIONAL and DEMONSTRATION purposes only.
              </p>
              
              <ul className="space-y-2 list-disc list-inside">
                <li>This is <strong className="text-white">NOT</strong> a professional financial advisory service</li>
                <li>Predictions generated are <strong className="text-white">NOT</strong> guaranteed to be accurate</li>
                <li>This tool should <strong className="text-white">NOT</strong> be used as the sole basis for investment decisions</li>
                <li>Past performance does <strong className="text-white">NOT</strong> indicate future results</li>
                <li>Stock trading involves substantial risk of loss</li>
              </ul>
              
              <p className="text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4">
                <strong className="text-red-400">Disclaimer:</strong> We do not claim to provide actual stock predictions. 
                The creators and operators of this website are not responsible for any financial losses incurred 
                through the use of this tool. Always consult with a licensed financial advisor before making 
                investment decisions.
              </p>
            </div>
            
            <button
              onClick={() => setShowDisclaimer(false)}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-lg"
            >
              I Understand - Continue
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold">Stock Prediction AI</h1>
          </div>
          <p className="text-gray-400">Advanced machine learning models for stock forecasting</p>
        </div>

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Symbol Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Stock Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-400 focus:outline-none"
                placeholder="AAPL"
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">AI Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-400 focus:outline-none"
              >
                <option value="neural_prophet">Neural Prophet</option>
                <option value="lstm">LSTM Neural Network</option>
                <option value="arima">ARIMA</option>
                <option value="prophet">Facebook Prophet</option>
                <option value="linear_regression">Linear Regression</option>
              </select>
            </div>

            {/* Prediction Range */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Prediction Days: {predictionDays}
              </label>
              <input
                type="range"
                min="7"
                max="90"
                value={predictionDays}
                onChange={(e) => setPredictionDays(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Predict Button */}
            <div className="flex items-end">
              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Predict'}
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Cache: {cacheStatus}</span>
              </div>
              {currentPrice && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">
                    Live: ${currentPrice.toFixed(2)} ({lastUpdate})
                  </span>
                </div>
              )}
            </div>
            <div className="text-gray-400">
              Data points: {chartData.length}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold mb-4">
            {symbol} - {model.replace('_', ' ').toUpperCase()}
          </h2>
          
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis 
                  dataKey="date" 
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                />
                <YAxis 
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #ffffff20',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                  name="Price"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              {loading ? 'Loading data...' : 'Click "Predict" to start'}
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold mb-3">Model Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Selected Model:</p>
              <p className="font-medium">{model.replace('_', ' ').toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Prediction Horizon:</p>
              <p className="font-medium">{predictionDays} days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}