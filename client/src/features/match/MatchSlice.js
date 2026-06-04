import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  matchId: null,
  status: 'SCHEDULED',
  score: { runs: 0, wickets: 0 },
  timeline: [],
};

const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    setMatch(state, action) {
      return { ...state, ...action.payload };
    },
    appendBall(state, action) {
      state.timeline.push(action.payload);
      // TODO: update score from ball
    },
    updateScore(state, action) {
      state.score = action.payload;
    },
  },
});

export const { setMatch, appendBall, updateScore } = matchSlice.actions;
export default matchSlice.reducer;
