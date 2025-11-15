#!/bin/sh
set -e

echo "Starting VetPintar Backend..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations in production
if [ "$NODE_ENV" = "production" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy
fi

# Start application
echo "Starting application..."
exec "$@"
