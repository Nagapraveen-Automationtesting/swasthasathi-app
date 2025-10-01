#!/bin/bash

# Deployment script to handle immutable selector issue
set -e

echo "🔧 Handling Kubernetes deployment..."

# Check if deployment exists
if kubectl get deployment swasthasathi-app -n swasthasathi >/dev/null 2>&1; then
    echo "📦 Existing deployment found, deleting it first..."
    kubectl delete deployment swasthasathi-app -n swasthasathi --ignore-not-found=true
    echo "⏳ Waiting for pods to terminate..."
    kubectl wait --for=delete pod -l app=swasthasathi-app -n swasthasathi --timeout=60s || true
fi

echo "🚀 Applying new deployment..."
kubectl apply -k .

echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available deployment/swasthasathi-app -n swasthasathi --timeout=300s

echo "✅ Deployment completed successfully!"
