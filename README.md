# 🌤️ Weather-Forecasting-Climate-Analysis-System

## 📁 Project Structure
```
weather_app/
├── app.py                    ← Flask backend (auth + API + ML)
├── .env.example              ← Copy this to .env
├── .gitignore
├── requirements.txt
├── models/
│   ├── temperature_model.pkl ← PUT YOUR MODEL HERE
│   └── rain_model.pkl        ← PUT YOUR MODEL HERE
├── templates/
│   ├── auth.html             ← Login / Signup page
│   └── index.html            ← Main dashboard
└── static/
    ├── css/style.css
    └── js/script.js
```

## 🚀 Setup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env file
cp .env.example .env
# Edit .env and set your SECRET_KEY

# 3. Place pkl models in models/ folder

# 4. Run
python app.py

# 5. Open browser → http://localhost:5000
```

## ✨ Features
- 🔐 Login / Signup with password hashing (bcrypt)
- ⭐ Favourite cities per user (saved in SQLite)
- 🕐 Search history per user
- 📍 Auto-detect location via GPS
- 🌐 City search with suggestions
- 🎨 Dynamic animated backgrounds (day/night/rain/thunder/snow)
- 📊 Hourly + 10-day forecast with Chart.js
- 🌫️ AQI with PM10, O3, SO2, PM2.5, CO, NO2
- 🧭 Wind compass with animated needle
- 🧠 ML prediction modal (your pkl models)
- ⚡ API response caching (10 min)
- 🛡️ Rate limiting (50 req/hour)
- 📱 Mobile responsive
