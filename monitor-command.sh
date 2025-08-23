#!/bin/bash
# Echo Rubicon Terminal Output Monitor

echo "🔧 Setting up Echo Rubicon monitoring..."

# Create logs directory
mkdir -p logs

# Get timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "📋 Available monitoring options:"
echo
echo "1. Real-time display + log file:"
echo "   npm start 2>&1 | tee logs/echo_live.log"
echo
echo "2. Background logging:"
echo "   npm start > logs/echo_${TIMESTAMP}.log 2>&1 &"
echo
echo "3. Specific command monitoring:"
echo "   your-command 2>&1 | tee logs/command_output.log"
echo
echo "🎯 Recommended: Use option 1 for real-time monitoring"
echo "   Then I can read 'logs/echo_live.log' to see what's happening!"
echo