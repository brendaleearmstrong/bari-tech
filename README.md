# BariTech - Complete Bariatric Lifestyle App

A fully functional bariatric lifestyle management application with real-time tracking, AI assistance, and comprehensive nutrition support.

## Features Implemented

### Authentication & Onboarding
- Secure signup/login with Supabase Auth
- 3-step onboarding: personal info, measurements, surgery details
- Profile management with automatic sync

### Dashboard (Real-Time Data)
- Live statistics: weight, BMI, days post-op
- Daily protein and water progress bars
- Meals logged counter
- Supplement compliance tracking
- Updates every 30 seconds
- Quick action buttons

### Nutrition Tracker
- 30+ pre-loaded bariatric-friendly meals
- Phase filtering and search
- One-click meal logging
- Real-time dashboard updates
- Recent meals history
- Complete macro information

### Water Tracker
- Visual progress bar
- Quick-add buttons (100ml, 250ml, 500ml, 750ml)
- Custom amount entry
- Today's log history
- Auto-calculated daily target
- Real-time sync

### Weight Tracker
- Current weight with BMI
- Weight loss percentage
- Logging with optional notes
- Complete history
- Profile auto-update

### Supplements Tracker
- Auto-generated schedule by surgery type
- Interactive checklist
- Compliance percentage
- Detailed timing and dosage
- Clinical guidelines included

### AI Assistant (Demo)
- Interactive chat interface
- Personalized responses
- Suggested questions
- Ready for voice/image input
- Context-aware advice

## Technology

- React 18 + TypeScript
- Vite build tool
- Tailwind CSS
- Supabase (database + auth)
- React Router v6
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

Build succeeds: 374 KB bundle, production-ready.

Database schema provided in init_migration.sql
Meal directory with 30+ items pre-loaded
All calculators operational (BMI, protein targets, etc.)

