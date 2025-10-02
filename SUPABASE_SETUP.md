# Supabase Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Go to **Project Settings** → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long JWT token)

## Step 2: Update Your .env File

In Bolt.new, update your `.env` file with:

```env
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Step 3: Run Database Migrations

You need to create the database tables. Go to:
**Your Supabase Dashboard → SQL Editor → New query**

Or use this direct link format:
`https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`

### Run Each Migration in Order:

#### Migration 1: Core Tables
Copy and paste the entire contents of `migrations/001_initial_schema.sql` and click **Run**

This creates:
- users table
- meal_directory table
- meal_entries and meal_items tables
- weight_entries table
- water_logs table
- phases table
- daily_summaries table
- All RLS policies

#### Migration 2: Supplements
Copy and paste the entire contents of `migrations/002_add_supplements.sql` and click **Run**

This creates:
- supplements table
- supplement_logs table
- RLS policies for supplements

#### Migration 3: Daily Summary Updates
Copy and paste the entire contents of `migrations/003_update_daily_summaries.sql` and click **Run**

This adds supplement tracking columns to daily_summaries.

## Step 4: Test the Connection

After running all migrations:
1. Refresh your Bolt.new app
2. The "Database Setup Required" message should disappear
3. You should see the login/signup page

## Troubleshooting

### "Invalid Supabase Configuration" Error
- Double-check your credentials in the `.env` file
- Make sure there are no extra spaces or quotes
- Verify the URL starts with `https://` and ends with `.supabase.co`

### "Table doesn't exist" Error
- Make sure all three migrations ran successfully
- Check the Supabase SQL Editor for any error messages
- Verify you're connected to the correct project

### Connection Timeout
- Check your Supabase project is active (not paused)
- Verify your internet connection
- Try refreshing the Supabase dashboard

## What Gets Created

The migrations create a complete bariatric lifestyle management system with:
- ✅ User profiles with surgery tracking
- ✅ Meal logging with nutrition data
- ✅ Water intake tracking
- ✅ Weight tracking with BMI
- ✅ Supplement scheduling and logging
- ✅ Phase-based dietary guidelines
- ✅ Daily summary aggregations
- ✅ Secure Row Level Security on all tables

## Need Help?

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify all migrations completed without errors
3. Make sure you're using the anon/public key (not the service role key)
