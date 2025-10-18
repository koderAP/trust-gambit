#!/bin/bash

# Real-time Traffic Monitoring Script for Trust Gambit
# Usage: ./monitor-traffic.sh

echo "🔍 Trust Gambit - Real-time Traffic Monitor"
echo "=========================================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Monitor Next.js dev server logs
monitor_app_logs() {
    echo "📊 Application Request Logs:"
    echo "----------------------------"
    if [ -f ".next/trace" ]; then
        tail -f .next/trace 2>/dev/null | while read line; do
            echo "[APP] $line"
        done &
    fi
    
    # If using docker
    if command_exists docker; then
        docker logs -f trustgambit-app 2>/dev/null | grep -E "GET|POST|PUT|DELETE" &
    fi
}

# Monitor PostgreSQL connections and queries
monitor_database() {
    echo ""
    echo "🗄️  Database Activity:"
    echo "----------------------------"
    
    if command_exists docker; then
        # Real-time connection count
        while true; do
            CONN_COUNT=$(docker exec -it trustgambit-db psql -U trustgambit -t -c \
                "SELECT count(*) FROM pg_stat_activity WHERE datname='trustgambit';" 2>/dev/null | tr -d ' \r')
            ACTIVE_QUERIES=$(docker exec -it trustgambit-db psql -U trustgambit -t -c \
                "SELECT count(*) FROM pg_stat_activity WHERE datname='trustgambit' AND state='active';" 2>/dev/null | tr -d ' \r')
            
            echo "[DB] Connections: $CONN_COUNT | Active Queries: $ACTIVE_QUERIES | $(date +%H:%M:%S)"
            sleep 2
        done &
    else
        echo "Docker not found. Install docker to monitor database."
    fi
}

# Monitor Redis operations
monitor_redis() {
    echo ""
    echo "🔴 Redis Activity:"
    echo "----------------------------"
    
    if command_exists docker; then
        docker exec -it trustgambit-redis redis-cli MONITOR 2>/dev/null | while read line; do
            echo "[REDIS] $line"
        done &
    else
        echo "Docker not found. Install docker to monitor Redis."
    fi
}

# Monitor system resources
monitor_resources() {
    echo ""
    echo "💻 System Resources:"
    echo "----------------------------"
    
    while true; do
        if command_exists docker; then
            # App container stats
            APP_STATS=$(docker stats trustgambit-app --no-stream --format "CPU: {{.CPUPerc}} | MEM: {{.MemUsage}}" 2>/dev/null)
            DB_STATS=$(docker stats trustgambit-db --no-stream --format "CPU: {{.CPUPerc}} | MEM: {{.MemUsage}}" 2>/dev/null)
            
            echo "[APP] $APP_STATS"
            echo "[DB]  $DB_STATS"
        else
            # Fallback to system stats
            if command_exists top; then
                top -l 1 | grep -E "CPU|PhysMem" | head -2
            fi
        fi
        sleep 5
        echo "---"
    done &
}

# Monitor HTTP requests using netstat/lsof
monitor_connections() {
    echo ""
    echo "🌐 Network Connections (Port 3000):"
    echo "----------------------------"
    
    while true; do
        if command_exists lsof; then
            CONN_COUNT=$(lsof -i :3000 2>/dev/null | grep ESTABLISHED | wc -l | tr -d ' ')
            echo "[NET] Active connections: $CONN_COUNT | $(date +%H:%M:%S)"
        fi
        sleep 2
    done &
}

# Trap Ctrl+C to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping monitors..."
    jobs -p | xargs kill 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Main execution
echo "Starting monitors (Press Ctrl+C to stop)..."
echo ""

# Start all monitors
monitor_database
sleep 1
monitor_connections
sleep 1
monitor_resources

# Keep script running
echo ""
echo "✅ Monitors active. Watching for traffic..."
echo ""

# Wait for user interrupt
wait
