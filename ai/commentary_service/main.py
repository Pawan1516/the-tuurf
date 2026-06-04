from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title='TheTurf AI Commentary Service')

class BallEvent(BaseModel):
    matchId: str
    inning: int
    over: int
    ball: int
    runs: int
    extra: str = None
    wicket: dict = None

@app.post('/commentary')
async def generate_commentary(event: BallEvent):
    # Placeholder: call ML model or LLM to generate commentary
    text = 'Placeholder commentary: {} runs'.format(event.runs)
    return { 'matchId': event.matchId, 'text': text }

@app.post('/predict')
async def predict_match_state(payload: dict):
    # Placeholder prediction
    return { 'winProbability': { 'teamA': 0.65, 'teamB': 0.35 } }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
