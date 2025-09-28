# Jenkins Setup Guide for Swasthasathi App

## 🔧 Required Jenkins Plugins

Install these plugins in your Jenkins instance:

```bash
# Core plugins
- Pipeline
- Pipeline: Stage View
- Git
- Docker Pipeline
- Kubernetes
- Kubernetes CLI

# Optional but recommended
- Blue Ocean (better UI)
- Slack Notification
- Email Extension
- Build Timeout
- Timestamper
- Workspace Cleanup
```

## 🔐 Required Jenkins Credentials

Configure these credentials in Jenkins (Manage Jenkins → Credentials):

### 1. Docker Registry Credentials
- **ID**: `docker-registry-credentials`
- **Type**: Username with password
- **Username**: Your Docker registry username
- **Password**: Your Docker registry password/token

### 2. Docker Registry URL
- **ID**: `docker-registry-url`
- **Type**: Secret text
- **Secret**: Your Docker registry URL (e.g., `docker.io`, `gcr.io`, `your-registry.com`)

### 3. Kubernetes Config
- **ID**: `kubeconfig`
- **Type**: Secret file
- **File**: Upload your kubeconfig file

### 4. Alternative: Kubernetes Token (if not using kubeconfig)
- **ID**: `k8s-token`
- **Type**: Secret text
- **Secret**: Your Kubernetes service account token

## 🚀 Jenkins Job Configuration

### 1. Create New Pipeline Job
1. Go to Jenkins Dashboard
2. Click "New Item"
3. Enter job name: `swasthasathi-app-pipeline`
4. Select "Pipeline"
5. Click "OK"

### 2. Configure Pipeline
1. **General Section**:
   - ✅ GitHub project (if using GitHub): `https://github.com/your-org/swasthasathi-app`
   - ✅ This project is parameterized (optional):
     - String Parameter: `DOCKER_TAG` (default: `latest`)
     - Choice Parameter: `ENVIRONMENT` (choices: `dev`, `staging`, `prod`)

2. **Build Triggers**:
   - ✅ GitHub hook trigger for GITScm polling
   - ✅ Poll SCM: `H/5 * * * *` (every 5 minutes)

3. **Pipeline Section**:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: Your Git repository URL
   - **Credentials**: Your Git credentials
   - **Branch**: `*/main` (or your main branch)
   - **Script Path**: `build-pipelines/Jenkinsfile`

### 3. Advanced Configuration (Optional)

#### Pipeline Libraries
If you want to use shared libraries, configure in Jenkins:
1. Manage Jenkins → Configure System
2. Global Pipeline Libraries
3. Add library with your shared pipeline functions

#### Webhook Setup (GitHub)
1. Go to your GitHub repository
2. Settings → Webhooks
3. Add webhook:
   - **URL**: `http://your-jenkins.com/github-webhook/`
   - **Content type**: `application/json`
   - **Events**: Push events, Pull requests

## 🌍 Environment-Specific Configuration

### Development Environment
```groovy
// In Jenkinsfile, add environment-specific logic
when {
    branch 'develop'
}
steps {
    script {
        env.NAMESPACE = 'swasthasathi-dev'
        env.INGRESS_HOST = 'dev.swasthasathi.yourdomain.com'
    }
}
```

### Staging Environment
```groovy
when {
    branch 'staging'
}
steps {
    script {
        env.NAMESPACE = 'swasthasathi-staging'
        env.INGRESS_HOST = 'staging.swasthasathi.yourdomain.com'
    }
}
```

### Production Environment
```groovy
when {
    branch 'main'
}
steps {
    script {
        env.NAMESPACE = 'swasthasathi'
        env.INGRESS_HOST = 'swasthasathi.yourdomain.com'
        // Add approval step for production
        input message: 'Deploy to Production?', ok: 'Deploy'
    }
}
```

## 🔍 Monitoring & Notifications

### Slack Integration
1. Install Slack Notification plugin
2. Configure Slack in Manage Jenkins → Configure System
3. Uncomment Slack notification sections in Jenkinsfile

### Email Notifications
1. Configure SMTP in Manage Jenkins → Configure System
2. Add email notifications in pipeline post actions

## 🐛 Troubleshooting

### Common Issues

#### 1. Docker Permission Issues
```bash
# Add Jenkins user to docker group on Jenkins agent
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

#### 2. Kubernetes Connection Issues
```bash
# Test kubectl from Jenkins agent
kubectl cluster-info
kubectl get nodes

# Check kubeconfig permissions
chmod 600 /path/to/kubeconfig
```

#### 3. Registry Push Issues
```bash
# Test Docker login manually
docker login your-registry.com
docker push test-image

# Check credentials in Jenkins
```

### Debug Commands
```bash
# Check Jenkins logs
sudo tail -f /var/log/jenkins/jenkins.log

# Check specific build logs in Jenkins UI
# Go to Build → Console Output

# Check Kubernetes deployment
kubectl get pods -n swasthasathi
kubectl describe pod <pod-name> -n swasthasathi
kubectl logs <pod-name> -n swasthasathi
```

## 📊 Pipeline Metrics

### Key Performance Indicators
- Build time (target: < 10 minutes)
- Deployment time (target: < 5 minutes)
- Success rate (target: > 95%)
- Time to recovery (target: < 15 minutes)

### Monitoring Setup
1. Enable Jenkins metrics plugin
2. Export metrics to Prometheus/Grafana
3. Set up alerts for failed builds
4. Monitor application health after deployment

## 🚀 Best Practices

### 1. Pipeline Optimization
- Use parallel stages where possible
- Cache Docker layers
- Use build agents with sufficient resources

### 2. Security
- Rotate credentials regularly
- Use least privilege principle
- Scan Docker images for vulnerabilities
- Enable RBAC in Kubernetes

### 3. Reliability
- Implement proper rollback mechanisms
- Use health checks and readiness probes
- Set appropriate timeouts
- Monitor resource usage

## 📝 Sample Pipeline Configuration

Create these files in your repository:

### `.jenkins/pipeline-config.yaml`
```yaml
environments:
  dev:
    namespace: swasthasathi-dev
    replicas: 1
    resources:
      requests:
        memory: "32Mi"
        cpu: "25m"
      limits:
        memory: "128Mi"
        cpu: "100m"
  
  staging:
    namespace: swasthasathi-staging
    replicas: 2
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "256Mi"
        cpu: "200m"
  
  prod:
    namespace: swasthasathi
    replicas: 3
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "256Mi"
        cpu: "200m"
```

This setup provides a robust CI/CD pipeline for your Swasthasathi App with proper security, monitoring, and environment management.
