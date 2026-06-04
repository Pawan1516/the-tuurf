from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import tensorflow as tf
import numpy as np

app = FastAPI(title="The Turf AI Engine")

# Model Architecture (Placeholder for LSTM)
# In a real scenario, you'd load: model = tf.keras.models.load_model('cricket_lstm.h5')

class MatchState(BaseModel):
    runs: int
    wickets: int
    overs: float
    target: int = 0
    innings: int
    batting_team_rank: float
    bowling_team_rank: float

@app.get("/")
def read_root():
    return {"status": "Neural Link Active", "engine": "TensorFlow 2.x"}

@app.post("/predict/win-probability")
async def predict_win(state: MatchState):
    """
    Step 23: Win Probability Model
    Algorithm: Logistic Regression / LSTM
    """
    # Simple Mock Logic for demonstration
    total_balls = 120 # T20
    balls_bowled = (int(state.overs) * 6) + int((state.overs % 1) * 10)
    balls_left = total_balls - balls_bowled
    
    if state.innings == 1:
        # Base probability for 1st innings
        prob = 0.5 + (state.runs / 200) - (state.wickets * 0.05)
    else:
        # 2nd innings chase logic
        runs_needed = state.target - state.runs
        if runs_needed <= 0: return {"win_prob": 1.0}
        
        required_rr = (runs_needed / (balls_left / 6)) if balls_left > 0 else 100
        prob = 1.0 - (required_rr / 15) - (state.wickets * 0.1)
    
    prob = max(0.01, min(0.99, prob))
    return {"win_prob": round(prob * 100, 2), "confidence": 0.85}

@app.post("/predict/projected-score")
async def predict_score(state: MatchState):
    """
    Step 24: Score Prediction Model
    Algorithm: RNN / GRU
    """
    if state.overs == 0: return {"projected": 160}
    
    current_rr = state.runs / state.overs
    # Dynamic projection based on wickets in hand
    projected = state.runs + (current_rr * (20 - state.overs) * (1 - (state.wickets * 0.08)))
    return {"projected": int(projected)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
