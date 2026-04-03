import sys
from crew import TurfBookingAutomationCrew

def run():
    """Run the crew with user input."""
    print("\n🏟️ --- THE TURF AI AGENT SYSTEM --- 🏟️\n")
    user_input = input("How can I help you today? (e.g., 'Book cricket turf tomorrow evening')\n> ")
    
    inputs = {
        "user_input": user_input
    }
    
    result = TurfBookingAutomationCrew().crew().kickoff(inputs=inputs)
    print("\n✅ --- FINAL OUTCOME --- ✅\n")
    print(result)

if __name__ == "__main__":
    run()
