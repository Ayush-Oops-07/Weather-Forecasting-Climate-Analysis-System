import os
import requests
import numpy as np
from datetime import datetime
from dotenv import load_dotenv

from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# ── Load .env ──
load_dotenv()

app = Flask(__name__)

# ══════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════
app.config['SECRET_KEY']          = os.environ.get('SECRET_KEY', 'dev-secret-change-this')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///weather.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['CACHE_TYPE']          = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = int(os.environ.get('CACHE_TIMEOUT', 600))

API_KEY  = os.environ.get('WEATHER_API_KEY', '2333fe7600c242efa0880536261801')
BASE_URL = 'https://api.weatherapi.com/v1'

# ── Extensions ──
db      = SQLAlchemy(app)
bcrypt  = Bcrypt(app)
cache   = Cache(app)
login_manager = LoginManager(app)
login_manager.login_view       = 'login'
login_manager.login_message    = 'Please login to access the dashboard.'
login_manager.login_message_category = 'info'

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=['200 per day', '50 per hour']
)

# ── ML Models ──
ML_CITIES = [
    'Jaipur','Lucknow','Ajmer','Hyderabad','Bangalore',
    'Kolkata','Mumbai','Kochi','Pune','Chennai',
    'New Delhi','Surat','Bhopal'
]
try:
    import joblib
    temp_model = joblib.load(os.path.join('models', 'temperature_model.pkl'))
    rain_model = joblib.load(os.path.join('models', 'rain_model.pkl'))
    MODELS_LOADED = True
    print('✅ ML Models loaded from models/')
except Exception as e:
    MODELS_LOADED = False
    print(f'⚠️  ML Models not loaded: {e}')


# ══════════════════════════════════════
#  DATABASE MODELS
# ══════════════════════════════════════
class User(db.Model, UserMixin):
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    searches      = db.relationship('SearchHistory', backref='user', lazy=True)
    favourites    = db.relationship('FavouriteCity', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)


class SearchHistory(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    city       = db.Column(db.String(100), nullable=False)
    searched_at = db.Column(db.DateTime, default=datetime.utcnow)


class FavouriteCity(db.Model):
    id      = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    city    = db.Column(db.String(100), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('user_id', 'city'),)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ══════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════
@app.route('/signup', methods=['GET', 'POST'])
@limiter.limit('10 per hour')
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')

        # Validation
        errors = []
        if len(username) < 3:
            errors.append('Username must be at least 3 characters.')
        if '@' not in email:
            errors.append('Enter a valid email address.')
        if len(password) < 6:
            errors.append('Password must be at least 6 characters.')
        if password != confirm:
            errors.append('Passwords do not match.')
        if User.query.filter_by(username=username).first():
            errors.append('Username already taken.')
        if User.query.filter_by(email=email).first():
            errors.append('Email already registered.')

        if errors:
            return jsonify({'success': False, 'errors': errors}), 400

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return jsonify({'success': True, 'redirect': url_for('dashboard')})

    return render_template('auth.html', mode='signup')


@app.route('/login', methods=['GET', 'POST'])
@limiter.limit('20 per hour')
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        identifier = request.form.get('identifier', '').strip()
        password   = request.form.get('password', '')
        remember   = request.form.get('remember') == 'on'

        # Allow login with username or email
        user = User.query.filter(
            (User.username == identifier) | (User.email == identifier.lower())
        ).first()

        if user and user.check_password(password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            return jsonify({'success': True, 'redirect': next_page or url_for('dashboard')})

        return jsonify({'success': False, 'errors': ['Invalid username/email or password.']}), 401

    return render_template('auth.html', mode='login')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ══════════════════════════════════════
#  MAIN DASHBOARD
# ══════════════════════════════════════
@app.route('/')
@login_required
def dashboard():
    # Get user's recent searches (last 5 unique)
    recent = (SearchHistory.query
              .filter_by(user_id=current_user.id)
              .order_by(SearchHistory.searched_at.desc())
              .all())
    seen, recent_cities = set(), []
    for s in recent:
        if s.city not in seen:
            seen.add(s.city)
            recent_cities.append(s.city)
        if len(recent_cities) == 5:
            break

    favs = [f.city for f in FavouriteCity.query.filter_by(user_id=current_user.id).all()]
    return render_template('index.html', recent_cities=recent_cities, favourites=favs)


# ══════════════════════════════════════
#  USER API ROUTES
# ══════════════════════════════════════
@app.route('/api/user/favourites', methods=['GET'])
@login_required
def get_favourites():
    favs = [f.city for f in FavouriteCity.query.filter_by(user_id=current_user.id).all()]
    return jsonify({'favourites': favs})


@app.route('/api/user/favourites/toggle', methods=['POST'])
@login_required
def toggle_favourite():
    city = request.json.get('city', '').strip()
    if not city:
        return jsonify({'error': 'City required'}), 400

    existing = FavouriteCity.query.filter_by(user_id=current_user.id, city=city).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'status': 'removed', 'city': city})
    else:
        fav = FavouriteCity(user_id=current_user.id, city=city)
        db.session.add(fav)
        db.session.commit()
        return jsonify({'status': 'added', 'city': city})


@app.route('/api/user/history')
@login_required
def get_history():
    recent = (SearchHistory.query
              .filter_by(user_id=current_user.id)
              .order_by(SearchHistory.searched_at.desc())
              .limit(10).all())
    seen, cities = set(), []
    for s in recent:
        if s.city not in seen:
            seen.add(s.city)
            cities.append(s.city)
    return jsonify({'history': cities})


def save_search(city):
    """Save search history for logged-in users."""
    if current_user.is_authenticated:
        try:
            h = SearchHistory(user_id=current_user.id, city=city)
            db.session.add(h)
            db.session.commit()
        except Exception:
            db.session.rollback()


# ══════════════════════════════════════
#  WEATHER API ROUTES (with caching)
# ══════════════════════════════════════
@app.route('/api/weather')
@login_required
def get_weather():
    city = request.args.get('city', 'Chennai').strip()
    if not city:
        return jsonify({'error': 'City name is required'}), 400

    cache_key = f'weather_{city.lower()}'
    cached = cache.get(cache_key)
    if cached:
        return jsonify(cached)

    try:
        resp = requests.get(
            f'{BASE_URL}/current.json',
            params={'key': API_KEY, 'q': city, 'aqi': 'yes'},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data)
        save_search(data['location']['name'])
        return jsonify(data)
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code
        return jsonify({'error': 'City not found.' if code == 400 else 'Weather service error'}), (404 if code == 400 else 502)
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/forecast')
@login_required
def get_forecast():
    city = request.args.get('city', 'Chennai').strip()
    days = request.args.get('days', '10')
    if not city:
        return jsonify({'error': 'City name is required'}), 400

    cache_key = f'forecast_{city.lower()}_{days}'
    cached = cache.get(cache_key)
    if cached:
        return jsonify(cached)

    try:
        resp = requests.get(
            f'{BASE_URL}/forecast.json',
            params={'key': API_KEY, 'q': city, 'days': days, 'aqi': 'yes', 'alerts': 'no'},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data)
        return jsonify(data)
    except requests.exceptions.HTTPError as e:
        code = e.response.status_code
        return jsonify({'error': 'City not found.' if code == 400 else 'Weather service error'}), (404 if code == 400 else 502)
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out.'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════
#  ML PREDICTION
# ══════════════════════════════════════
@app.route('/api/predict')
@login_required
def predict():
    if not MODELS_LOADED:
        return jsonify({'error': 'ML models not found in models/ folder.'}), 503

    city = request.args.get('city', '').strip()
    if not city:
        return jsonify({'error': 'City required'}), 400

    matched = next((c for c in ML_CITIES if c.lower() == city.lower()), None)
    if not matched:
        return jsonify({'supported': False, 'message': f'Model trained only for: {", ".join(ML_CITIES)}'}), 200

    try:
        resp = requests.get(
            f'{BASE_URL}/current.json',
            params={'key': API_KEY, 'q': city, 'aqi': 'no'},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        c = data['current']
        features = np.array([[c['humidity'], c['wind_kph'], c['pressure_mb'], c['precip_mm'], c['uv']]])
        pred_temp = round(float(temp_model.predict(features)[0]), 1)
        pred_rain = round(max(0.0, min(100.0, float(rain_model.predict(features)[0]))), 1)
        return jsonify({'supported': True, 'city': data['location']['name'],
                        'predicted_temp': pred_temp, 'predicted_rain': pred_rain})
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


# ══════════════════════════════════════
#  INIT DB + RUN
# ══════════════════════════════════════
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
