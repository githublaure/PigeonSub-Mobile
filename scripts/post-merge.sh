#!/bin/bash
set -e

# Install mobile app dependencies
npm ci

# Install backend dependencies
cd backend && npm ci
