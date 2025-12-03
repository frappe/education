#!/bin/bash

# Quick start script for the education dashboard

echo "🚀 Starting Education Dashboard Frontend"
echo "========================================"
echo ""

# Check if Frappe is running
echo "📡 Checking Frappe backend..."
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "✅ Frappe backend is running on port 8000"
else
    echo "❌ Frappe backend is NOT running!"
    echo ""
    echo "Please start Frappe first:"
    echo "  cd /home/anushree/frappe-bench-education"
    echo "  bench start"
    echo ""
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎨 Starting frontend development server..."
echo "Dashboard will be available at: http://localhost:5173"
echo ""
npm run dev
