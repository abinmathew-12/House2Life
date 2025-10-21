# backend/train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import joblib
import numpy as np

# --- Simulated realistic data for training ---
np.random.seed(42)

data_size = 300

square_feet = np.random.randint(600, 4000, size=data_size)
rooms = np.random.randint(2, 10, size=data_size)
bathrooms = np.random.randint(1, 6, size=data_size)
kitchen = np.ones(data_size)
sitout = np.random.randint(0, 2, size=data_size)
floors = np.random.choice([1, 2], size=data_size, p=[0.6, 0.4])

# Approximate formula with some randomness
base_cost_per_sqft = 1800
budget = (
    square_feet * base_cost_per_sqft
    + rooms * 50000
    + bathrooms * 25000
    + sitout * 15000
    + floors * 200000
    + np.random.randint(-200000, 200000, size=data_size)
)

df = pd.DataFrame({
    "square_feet": square_feet,
    "rooms": rooms,
    "bathrooms": bathrooms,
    "kitchen": kitchen,
    "sitout": sitout,
    "floors": floors,
    "budget": budget
})

# Split and train
X = df[["square_feet", "rooms", "bathrooms", "kitchen", "sitout", "floors"]]
y = df["budget"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# Evaluate
preds = model.predict(X_test)
print("Model R² Score:", round(r2_score(y_test, preds), 3))

# Save model
joblib.dump(model, "model/house_budget_model.pkl")
print("✅ Model trained and saved at 'model/house_budget_model.pkl'")
