from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

model = joblib.load("model/house_budget_model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    sqft = data.get("square_feet", 0)
    rooms = data.get("rooms", 0)
    baths = data.get("bathrooms", 0)
    kitchen = data.get("kitchen", 0)
    sitout = data.get("sitout", 0)
    floors = data.get("floors", 1)

    input_array = np.array([[sqft, rooms, baths, kitchen, sitout, floors]])
    prediction = model.predict(input_array)[0]

    # Confidence range using individual tree predictions
    all_preds = np.array([tree.predict(input_array)[0] for tree in model.estimators_])
    pred_min = float(np.min(all_preds))
    pred_max = float(np.max(all_preds))

    return jsonify({
        "estimated_budget": round(prediction, 2),
        "min_budget": round(pred_min, 2),
        "max_budget": round(pred_max, 2)
    })

if __name__ == "__main__":
    app.run(debug=True)
