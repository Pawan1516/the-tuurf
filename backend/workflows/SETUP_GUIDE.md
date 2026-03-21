# Slot Booking Chatbot v2 - Setup Guide

## Overview
This is an n8n workflow that implements a multi-functional slot booking chatbot with four main capabilities:
1. **Book New Slot** - Collect customer details and save bookings to MongoDB
2. **Update Existing Slot** - Find and reschedule existing bookings
3. **Check Booking** - Display booking details via mobile number
4. **Cancel Booking** - Mark bookings as cancelled with timestamps

## Workflow Components

### Nodes Overview

| Node | Type | Purpose |
|------|------|---------|
| **When chat message received** | Chat Trigger | Receives incoming chat messages |
| **AI Agent** | LangChain Agent | Orchestrates the conversation flow with AI |
| **Google Gemini Chat Model** | LLM | Processes natural language and decides actions |
| **Simple Memory** | Memory Buffer | Maintains conversation context & session state |
| **MongoDB - Insert Booking** | MongoDB | Saves new bookings to database |
| **MongoDB - Update Slot** | MongoDB | Updates existing booking slots |
| **MongoDB - Find Booking** | MongoDB | Queries bookings by mobile number |

## Setup Instructions

### Step 1: Import Workflow into n8n
1. Open your n8n instance
2. Click **"Create"** → **"Import from file"**
3. Select `slot-booking-chatbot-v2.json`
4. Click **Import**

### Step 2: Configure Credentials

#### Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create or copy your API key
3. In n8n, click **Credentials** → **Create New** → **Google Gemini(PaLM) Api account**
4. Paste your API key
5. Update the credential ID in the **Google Gemini Chat Model** node

#### MongoDB Connection
1. In n8n, click **Credentials** → **Create New** → **MongoDB**
2. Configure with your MongoDB connection details:
   - Host: `cluster0.itzk1ia.mongodb.net`
   - Database: `the-turf`
   - Username: `pvan_db_user`
   - Password: (from your .env file)
3. Copy the credential ID
4. Update the credential IDs in all three MongoDB nodes:
   - MongoDB - Insert Booking
   - MongoDB - Update Slot
   - MongoDB - Find Booking

### Step 3: Configure Collection Name (if different)
If your MongoDB collection is not named `slot_bookings`, update the collection name in:
- MongoDB - Insert Booking
- MongoDB - Update Slot
- MongoDB - Find Booking

### Step 4: Customize System Prompt
Edit the **AI Agent** node's **"system message"** to customize:
- Greeting message
- Available time slots
- Payment details (UPI ID, amount)
- Facility details (location, amenities)
- Tone and language preferences

### Step 5: Deploy & Test
1. Click **"Save"**
2. Click **"Activate"** to enable the workflow
3. Share the webhook URL with users or integrate into your application

## Webhook URL
Once activated, the workflow generates a webhook URL:
```
https://your-n8n-instance.com/webhook/f7cbfa83-b547-4a33-b9b3-5bbab87d02a2
```

## API Integration

### Sending Messages to the Chatbot

**Endpoint:** POST `/webhook/{webhookId}`

**Request Body:**
```json
{
  "message": "I want to book a slot",
  "sessionId": "user_123",
  "metadata": {
    "platform": "whatsapp",
    "userId": "user_123"
  }
}
```

**Response:**
```json
{
  "message": "👋 Welcome to our Slot Booking System!\nWhat would you like to do today?\n\n1️⃣ Book a New Slot\n2️⃣ Update Existing Slot\n3️⃣ Check My Booking\n4️⃣ Cancel Booking\n\nPlease reply with the number of your choice.",
  "sessionId": "user_123"
}
```

## Conversation Flows

### Flow 1: Book New Slot
```
User: "1" or "Book a new slot"
→ Bot asks for: Name
→ Bot asks for: Mobile (10 digits)
→ Bot shows available slots
→ Bot asks for: Slot date & time
→ Bot asks for payment
→ Bot requests: Transaction ID
→ Bot requests: Payment screenshot & ID proof
→ Bot confirms and saves to MongoDB
```

### Flow 2: Update Existing Slot
```
User: "2" or "Update my slot"
→ Bot asks for: Mobile number
→ Bot retrieves current booking
→ Bot asks for: New slot preference
→ Bot confirms update
→ Bot updates MongoDB record
```

### Flow 3: Check Booking
```
User: "3" or "Check my booking"
→ Bot asks for: Mobile number
→ Bot retrieves and displays all booking details
```

### Flow 4: Cancel Booking
```
User: "4" or "Cancel my booking"
→ Bot asks for: Mobile number
→ Bot asks for: Confirmation (YES/NO)
→ If YES: Updates booking status to "cancelled"
→ If NO: Aborts cancellation
```

## MongoDB Schema

### slot_bookings Collection

```javascript
{
  "_id": ObjectId,
  "name": "John Doe",                          // User's full name
  "mobile": "9876543210",                      // 10-digit mobile
  "slot_time": "2025-03-15 3:00 PM - 5:00 PM",// Slot date & time
  "transaction_id": "UPI123456789",            // Payment transaction ID
  "image_uploaded": true,                      // Payment proof uploaded
  "booking_status": "confirmed",               // Status: confirmed|rescheduled|cancelled
  "created_at": "2025-03-06T10:30:00Z",       // Booking creation timestamp
  "updated_at": "2025-03-06T10:30:00Z",       // Last update timestamp
  "cancelled_at": null                         // Cancellation timestamp (if applicable)
}
```

## Testing the Workflow

### Test Case 1: Book a New Slot
1. Send message: `"Book a new slot"`
2. Follow the prompts
3. Verify data is saved in MongoDB

### Test Case 2: Check Booking
1. Send message: `"Check my booking"`
2. Provide the mobile number you used
3. Verify details are returned correctly

### Test Case 3: Update Slot
1. Send message: `"Update my slot"`
2. Provide the mobile number
3. Select new time
4. Verify `booking_status` changed to "rescheduled"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Credential not found" | Re-add and copy the correct credential IDs to all nodes |
| MongoDB connection fails | Verify connection string in credentials and ensure IP is whitelisted |
| Agent not responding | Check system prompt for syntax errors (especially quotes) |
| Memory not persisting | Ensure Simple Memory node is properly connected to AI Agent |

## Customization Examples

### Change Business Hours
Edit system message in AI Agent node - modify time slots section

### Change Currency/Pricing
Edit system message - update payment amounts

### Multi-language Support
The AI Agent already supports auto-detection. Messages will be answered in the user's language.

### Custom Fields
To add new fields (e.g., "purpose", "player_count"):
1. Update MongoDB Insert node: Add to "fields" parameter
2. Update AI Agent system prompt: Include in STEP 6 confirmation message
3. Update MongoDB schema queries as needed

## Integration with Your Express Server

To integrate with your existing Express API, you can:

1. **Option A: Use n8n's Webhook Directly**
   - Call n8n webhook from your frontend
   - n8n handles all chatbot logic

2. **Option B: Proxy through Express**
   ```javascript
   app.post('/api/chatbot/v2', async (req, res) => {
     const { message, userId } = req.body;
     const response = await fetch('https://your-n8n-instance.com/webhook/{webhookId}', {
       method: 'POST',
       body: JSON.stringify({ message, sessionId: userId })
     });
     const data = await response.json();
     res.json(data);
   });
   ```

3. **Option C: Run Alongside Existing Bot**
   - Use `/api/chatbot` for current AI (CricBot)
   - Use `/api/chatbot/v2` for n8n bot
   - Let users choose which interface to use

## Support & Updates

For issues or feature requests:
1. Check n8n documentation: https://docs.n8n.io/
2. Review MongoDB connection settings
3. Verify API credentials are active and valid
4. Check n8n execution logs for detailed errors
