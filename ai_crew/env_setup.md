# CrewAI Environment Setup for THE TURF 🏟️

This directory contains the autonomous AI multi-agent system for managing bookings, pricing, and notifications.

## Prerequisites

*   Python 3.10+
*   Node.js (Backend)

## 🏗️ 1. Setup Python Environment

Create a virtual environment:

```bash
python -m venv venv
source venv/Scripts/activate # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

## 🔑 2. Configure Environment Variables

Create a `.env` file in this directory and add your API keys:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
# Any other provider you intend to use
```

## 🚀 3. Run the AI Crew

Launch the core agent system and test a booking request:

```bash
python main.py
```

## 🎯 4. Connect to Backend (Optional)

The tools in `main.py` currently use mock functions. To connect to your Node.js backend:
*   Update the `checkAvailability`, `bookTurf`, and other tool functions to make HTTP requests (using `requests`) to your backend API endpoints (e.g., `http://localhost:5000/api/slots`).
*   Ensure your Node.js server is running before executing the AI crew.
