import os
from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from langchain_community.tools import tool
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BACKEND_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:5001")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

# --- DYNAMIC TOOLS ---

@tool("checkAvailability")
def checkAvailability(date_str: str):
    """Checks turf availability for a specific date (YYYY-MM-DD)."""
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/api/slots?date={date_str}", timeout=10)
        if response.status_code == 200:
            slots = response.json()
            available = [{"id": s["_id"], "time": f"{s['startTime']} - {s['endTime']}"} for s in slots if s["status"] == "free"]
            return json.dumps(available) if available else "No slots available."
        return f"Error: {response.status_code}"
    except Exception as e:
        return str(e)

@tool("bookTurf")
def bookTurf(userName: str, userPhone: str, slotId: str, amount: float, date: str, startTime: str):
    """Books a turf slot with the provided details."""
    payload = {"userName": userName, "userPhone": userPhone, "slotId": slotId, "amount": amount, "date": date, "startTime": startTime}
    try:
        response = requests.post(f"{BACKEND_BASE_URL}/api/bookings", json=payload, timeout=10)
        return json.dumps(response.json()) if response.status_code in [200, 201] else f"Fail: {response.text}"
    except Exception as e:
        return str(e)

@tool("getPricing")
def getPricing():
    """Gets current pricing settings."""
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/api/slots/settings", timeout=10)
        return json.dumps(response.json()) if response.status_code == 200 else "Error"
    except Exception as e:
        return str(e)

# --- CREW DEFINITION ---

@CrewBase
class TurfBookingAutomationCrew:
    """Turf Booking Automation Crew using YAML configs"""

    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    def __init__(self) -> None:
        self.llm = LLM(model=os.getenv("MODEL", "openai/gpt-4o-mini"))

    @agent
    def ai_coordinator_and_task_supervisor(self) -> Agent:
        return Agent(
            config=self.agents_config['ai_coordinator_and_task_supervisor'],
            llm=self.llm,
            verbose=True,
            allow_delegation=True
        )

    @agent
    def turf_booking_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config['turf_booking_specialist'],
            tools=[checkAvailability, bookTurf, getPricing],
            llm=self.llm,
            verbose=True
        )

    @agent
    def dynamic_pricing_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config['dynamic_pricing_analyst'],
            tools=[getPricing],
            llm=self.llm,
            verbose=True
        )

    @agent
    def user_notification_manager(self) -> Agent:
        return Agent(
            config=self.agents_config['user_notification_manager'],
            llm=self.llm,
            verbose=True
        )

    @agent
    def tournament_organizer(self) -> Agent:
        return Agent(
            config=self.agents_config['tournament_organizer'],
            llm=self.llm,
            verbose=True
        )

    @task
    def process_turf_booking_request(self) -> Task:
        return Task(config=self.tasks_config['process_turf_booking_request'])

    @task
    def analyze_pricing_strategy(self) -> Task:
        return Task(config=self.tasks_config['analyze_pricing_strategy'])

    @task
    def send_user_notifications(self) -> Task:
        return Task(config=self.tasks_config['send_user_notifications'])

    @task
    def organize_tournament(self) -> Task:
        return Task(config=self.tasks_config['organize_tournament'])

    @task
    def coordinate_turf_operations(self) -> Task:
        return Task(config=self.tasks_config['coordinate_turf_operations'])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.hierarchical,
            manager_agent=self.ai_coordinator_and_task_supervisor(),
            verbose=True
        )
