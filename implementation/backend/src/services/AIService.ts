import Google from '@google-cloud/generative-ai';
import { config } from '../config/environment';

const client = new Google.GoogleGenerativeAI(config.GEMINI_API_KEY!);

export class AIService {
  async generateCommentary(ballEvent: any): Promise<string> {
    try {
      const prompt = `Generate exciting cricket commentary for the following situation in one line:
        Bowler: ${ballEvent.bowler}
        Batsman: ${ballEvent.batsman}
        Runs: ${ballEvent.runs}
        Overs: ${ballEvent.overs}
        Match Situation: ${ballEvent.situation}
        Style: ${ballEvent.style || 'energetic'}
        
        Provide only the commentary line, no explanation.`;

      const model = client.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      
      return result.response.text();
    } catch (error) {
      console.error('Error generating commentary:', error);
      throw error;
    }
  }

  async predictMatchWinner(matchData: any): Promise<{ team1Probability: number; team2Probability: number }> {
    try {
      const prompt = `Based on the following cricket match data, predict the probability of each team winning:
        Team 1: ${matchData.team1.name}
        Team 1 Stats: Wins: ${matchData.team1.wins}, Losses: ${matchData.team1.losses}
        Team 2: ${matchData.team2.name}
        Team 2 Stats: Wins: ${matchData.team2.wins}, Losses: ${matchData.team2.losses}
        Venue: ${matchData.venue}
        Format: ${matchData.format}
        
        Respond with JSON: { "team1_probability": number, "team2_probability": number }`;

      const model = client.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          team1Probability: parsed.team1_probability,
          team2Probability: parsed.team2_probability
        };
      }

      return { team1Probability: 0.5, team2Probability: 0.5 };
    } catch (error) {
      console.error('Error predicting match winner:', error);
      throw error;
    }
  }

  async generatePlayerRecommendations(userProfile: any): Promise<string[]> {
    try {
      const prompt = `Based on the following player profile, recommend 5 turfs and playing strategies:
        Skill Level: ${userProfile.skillLevel}
        Preferred Format: ${userProfile.preferredFormat}
        Role: ${userProfile.role}
        Experience: ${userProfile.experience}
        Location: ${userProfile.location}
        
        Provide 5 recommendations in JSON array format with names and reasons.`;

      const model = client.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      
      const jsonMatch = result.response.text().match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
