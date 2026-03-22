import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib

# -----------------------
# Load Dataset
# -----------------------
df = pd.read_excel("Forcast_Hour.xlsx")

print("Dataset Shape:", df.shape)

# -----------------------
# Correct Column Names
# -----------------------

features = [
    "forecast.forecastday.hour.humidity",
    "forecast.forecastday.hour.wind_kph",
    "forecast.forecastday.hour.pressure_mb",
    "forecast.forecastday.hour.precip_mm",
    "forecast.forecastday.hour.uv"
]

target_temp = "forecast.forecastday.hour.temp_c"
target_rain = "forecast.forecastday.hour.chance_of_rain"

# -----------------------
# Clean Data
# -----------------------

df = df.dropna(subset=features + [target_temp, target_rain])

X = df[features]

y_temp = df[target_temp]
y_rain = df[target_rain]

# -----------------------
# Train Test Split
# -----------------------

X_train, X_test, y_temp_train, y_temp_test = train_test_split(
    X, y_temp, test_size=0.2, random_state=42
)

_, _, y_rain_train, y_rain_test = train_test_split(
    X, y_rain, test_size=0.2, random_state=42
)

# -----------------------
# Temperature Model
# -----------------------

temp_model = RandomForestRegressor(n_estimators=200, random_state=42)

temp_model.fit(X_train, y_temp_train)

temp_pred = temp_model.predict(X_test)

temp_error = mean_absolute_error(y_temp_test, temp_pred)

print("Temperature MAE:", temp_error)

# -----------------------
# Rain Model
# -----------------------

rain_model = RandomForestRegressor(n_estimators=200, random_state=42)

rain_model.fit(X_train, y_rain_train)

rain_pred = rain_model.predict(X_test)

rain_error = mean_absolute_error(y_rain_test, rain_pred)

print("Rain MAE:", rain_error)

# -----------------------
# Save Models
# -----------------------

joblib.dump(temp_model, "temperature_model.pkl")
joblib.dump(rain_model, "rain_model.pkl")

print("Models saved successfully!")