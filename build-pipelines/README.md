# Swasthasathi App - Kubernetes Deployment

This directory contains Kubernetes deployment manifests for the Swasthasathi App.

## 📁 Files Overview

| File | Description |
|------|-------------|
| `namespace.yaml` | Creates the `swasthasathi` namespace |
| `deployment.yaml` | Main application deployment with 3 replicas |
| `service.yaml` | ClusterIP and LoadBalancer services |
| `ingress.yaml` | Ingress configuration with SSL and security headers |
| `configmap.yaml` | Application configuration |
| `kustomization.yaml` | Kustomize configuration for deployment |
| `Jenkinsfile` | Complete Jenkins CI/CD pipeline |
| `jenkins-setup.md` | Detailed Jenkins configuration guide |

## 🚀 Jenkins CI/CD Pipeline

### Prerequisites
- Kubernetes cluster is configured
- Jenkins with required plugins (see `jenkins-setup.md`)
- Jenkins credentials configured (Docker registry, kubeconfig)
- nginx-ingress-controller is installed in the cluster

### Automated Pipeline Features
The `Jenkinsfile` provides a complete CI/CD pipeline with:

1. **Source Code Checkout** - Gets latest code from Git
2. **Dependency Installation** - `npm ci` and linting
3. **Application Build** - `npm run build` with verification
4. **Docker Image Build** - Multi-stage build with labels
5. **Security Scanning** - Trivy vulnerability scanning
6. **Registry Push** - Pushes to your Docker registry
7. **Manifest Updates** - Updates Kubernetes manifests with new image tags
8. **Kubernetes Deployment** - Applies manifests using kustomize
9. **Health Checks** - Verifies deployment success
10. **Notifications** - Success/failure notifications (Slack/Email)

### Manual Deployment (Alternative)

If not using Jenkins, you can deploy manually:

1. **Build Docker Image**
   ```bash
   docker build -t your-registry/swasthasathi-app:${BUILD_NUMBER} .
   ```

2. **Push to Registry**
   ```bash
   docker push your-registry/swasthasathi-app:${BUILD_NUMBER}
   ```

3. **Update Image Tag**
   ```bash
   # Using kustomize
   cd build-pipelines
   kustomize edit set image swasthasathi-app=your-registry/swasthasathi-app:${BUILD_NUMBER}
   ```

4. **Deploy to Kubernetes**
   ```bash
   # Using kubectl
   kubectl apply -k build-pipelines/
   ```

### Jenkins Setup
See `jenkins-setup.md` for detailed configuration instructions including:
- Required plugins
- Credential configuration
- Webhook setup
- Environment-specific deployments

## 🔧 Manual Deployment

### 1. Deploy All Resources
```bash
# Using kustomize (recommended)
kubectl apply -k build-pipelines/

# Or deploy individual files
kubectl apply -f build-pipelines/namespace.yaml
kubectl apply -f build-pipelines/configmap.yaml
kubectl apply -f build-pipelines/deployment.yaml
kubectl apply -f build-pipelines/service.yaml
kubectl apply -f build-pipelines/ingress.yaml
```

### 2. Verify Deployment
```bash
# Check namespace
kubectl get namespace swasthasathi

# Check all resources in namespace
kubectl get all -n swasthasathi

# Check pods are running
kubectl get pods -n swasthasathi

# Check services
kubectl get services -n swasthasathi

# Check ingress
kubectl get ingress -n swasthasathi
```

### 3. Check Application Health
```bash
# Port forward for local testing
kubectl port-forward -n swasthasathi service/swasthasathi-app-service 8080:80

# Test health endpoint
curl http://localhost:8080/health
```

## 🌐 Configuration

### Environment Variables
- `NODE_ENV`: Set to "production"
- `VITE_APP_BASE_PATH`: Set to "/swasthasathi-app/"

### Resource Limits
- **Requests**: 64Mi memory, 50m CPU
- **Limits**: 256Mi memory, 200m CPU

### Health Checks
- **Liveness Probe**: `/health` endpoint, starts after 30s
- **Readiness Probe**: `/health` endpoint, starts after 5s

## 🔒 Security Features

### Container Security
- Runs as non-root user (1001)
- Drops all capabilities
- Disables privilege escalation

### Network Security
- Security headers via nginx.conf and ingress
- CORS configuration for API access
- Rate limiting (10 requests/second)
- SSL/TLS termination

## 📊 Scaling

### Horizontal Scaling
```bash
# Scale deployment
kubectl scale deployment swasthasathi-app -n swasthasathi --replicas=5

# Auto-scaling (if HPA is configured)
kubectl autoscale deployment swasthasathi-app -n swasthasathi --cpu-percent=70 --min=3 --max=10
```

### Rolling Updates
```bash
# Update image
kubectl set image deployment/swasthasathi-app -n swasthasathi swasthasathi-app=your-registry/swasthasathi-app:new-tag

# Check rollout status
kubectl rollout status deployment/swasthasathi-app -n swasthasathi

# Rollback if needed
kubectl rollout undo deployment/swasthasathi-app -n swasthasathi
```

## 🐛 Troubleshooting

### Common Commands
```bash
# Check pod logs
kubectl logs -n swasthasathi deployment/swasthasathi-app

# Describe problematic pods
kubectl describe pod -n swasthasathi <pod-name>

# Get events
kubectl get events -n swasthasathi --sort-by='.lastTimestamp'

# Execute into pod
kubectl exec -it -n swasthasathi <pod-name> -- sh
```

### Common Issues
1. **ImagePullBackOff**: Check image name and registry access
2. **CrashLoopBackOff**: Check application logs and health endpoints
3. **Service not accessible**: Verify service labels match deployment labels
4. **Ingress not working**: Check ingress controller and DNS configuration

## 📝 Notes

- Replace `swasthasathi.yourdomain.com` in `ingress.yaml` with your actual domain
- Update the image repository path in your Jenkins pipeline
- Configure TLS certificates for production use
- Consider using sealed secrets or external secret management for sensitive data
