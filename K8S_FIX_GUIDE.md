# 🔧 Kubernetes Deployment Fix Guide

## 🚨 Current Issue
```
error: unable to load root certificates: unable to parse bytes as PEM block
```

This error occurs when Jenkins cannot authenticate with your Kubernetes cluster.

## ✅ Solution Options

### **Option 1: Fix Kubeconfig Authentication (Recommended)**

#### Step 1: Verify Local Kubernetes Access
```bash
# Test your local kubectl connection
kubectl cluster-info
kubectl get nodes
kubectl get namespaces

# If these work, your kubeconfig is valid
```

#### Step 2: Update Jenkins Kubeconfig Credential
1. **Jenkins Dashboard → Manage Jenkins → Credentials**
2. **Find/Edit credential with ID: `kubeconfig`**
3. **Replace with working kubeconfig:**
   - Type: `Secret file`
   - File: Upload your `~/.kube/config`
   - ID: `kubeconfig`
   - Description: `Kubernetes cluster configuration`

#### Step 3: Verify Kubeconfig File Format
Your kubeconfig should look like this:
```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTi... # Base64 encoded
    server: https://your-k8s-cluster.com:6443
  name: your-cluster
contexts:
- context:
    cluster: your-cluster
    user: your-user
  name: your-context
current-context: your-context
kind: Config
users:
- name: your-user
  user:
    client-certificate-data: LS0tLS1CRUdJTi... # Base64 encoded
    client-key-data: LS0tLS1CRUdJTi... # Base64 encoded
```

### **Option 2: Service Account Token Method**

#### Step 1: Create Kubernetes Service Account
```bash
# Create service account
kubectl create serviceaccount jenkins-sa -n swasthasathi

# Create cluster role binding
kubectl create clusterrolebinding jenkins-sa-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=swasthasathi:jenkins-sa

# Get the token (for K8s 1.24+)
kubectl create token jenkins-sa -n swasthasathi --duration=87600h
```

#### Step 2: Update Jenkins Credentials
1. **Create new credential:**
   - Type: `Secret text`
   - Secret: `<paste-token-here>`
   - ID: `k8s-token`
   - Description: `Kubernetes service account token`

2. **Create cluster URL credential:**
   - Type: `Secret text` 
   - Secret: `https://your-k8s-api-server:6443`
   - ID: `k8s-server-url`

#### Step 3: Update Jenkinsfile (Alternative method)
Replace the deployment stage with:
```groovy
stage('Deploy to Kubernetes') {
    steps {
        script {
            echo "🚀 Deploying to Kubernetes..."
            withCredentials([
                string(credentialsId: 'k8s-token', variable: 'K8S_TOKEN'),
                string(credentialsId: 'k8s-server-url', variable: 'K8S_SERVER')
            ]) {
                dir('build-pipelines') {
                    sh """
                        # Configure kubectl with token
                        kubectl config set-cluster kubernetes --server=\$K8S_SERVER --insecure-skip-tls-verify=true
                        kubectl config set-credentials jenkins --token=\$K8S_TOKEN
                        kubectl config set-context jenkins --cluster=kubernetes --user=jenkins
                        kubectl config use-context jenkins
                        
                        # Test connection
                        kubectl cluster-info
                        
                        # Deploy application
                        kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        kubectl apply -k .
                        kubectl rollout status deployment/swasthasathi-app -n ${NAMESPACE} --timeout=300s
                    """
                }
            }
        }
    }
}
```

### **Option 3: Docker Desktop Kubernetes (Local Testing)**

If using Docker Desktop with Kubernetes:

#### Step 1: Get Docker Desktop Kubeconfig
```bash
# Copy Docker Desktop kubeconfig
cp ~/.kube/config ~/.kube/config-docker-desktop

# Verify it works
kubectl --kubeconfig ~/.kube/config-docker-desktop get nodes
```

#### Step 2: Upload to Jenkins
Upload the `config-docker-desktop` file as the kubeconfig credential.

## 🔍 **Debugging Steps**

### 1. Test Kubeconfig Locally
```bash
# Test the exact kubeconfig file you uploaded to Jenkins
kubectl --kubeconfig /path/to/uploaded/config cluster-info
```

### 2. Check Certificate Validity
```bash
# Decode and check certificates
kubectl config view --raw -o json | jq -r '.clusters[0].cluster."certificate-authority-data"' | base64 -d | openssl x509 -text -noout
```

### 3. Jenkins Agent Debugging
```bash
# From Jenkins agent/node, test kubectl
docker exec -it <jenkins-container> /bin/bash
kubectl cluster-info
```

### 4. Common Certificate Issues
- **Expired certificates**: Regenerate cluster certificates
- **Wrong CA**: Ensure certificate-authority-data matches your cluster
- **Network issues**: Verify Jenkins can reach Kubernetes API server
- **Firewall**: Check if port 6443 (or your K8s API port) is accessible

## 🚨 **Quick Fixes**

### Fix 1: Regenerate Kubeconfig
```bash
# If using managed K8s (AKS/EKS/GKE), regenerate config:

# AKS
az aks get-credentials --resource-group myResourceGroup --name myCluster --overwrite-existing

# EKS  
aws eks update-kubeconfig --region region-code --name cluster-name

# GKE
gcloud container clusters get-credentials cluster-name --zone=zone-name
```

### Fix 2: Skip TLS Verification (Temporary)
For testing only, add to kubectl commands:
```bash
kubectl --insecure-skip-tls-verify=true cluster-info
```

## ✅ **Verification Steps**

After implementing fix:

1. **Trigger new Jenkins build**
2. **Check deployment stage logs**
3. **Verify pods are running:**
   ```bash
   kubectl get pods -n swasthasathi
   kubectl get services -n swasthasathi  
   kubectl get ingress -n swasthasathi
   ```

## 📋 **Expected Success Output**
```
🚀 Deploying to Kubernetes...
Kubernetes master is running at https://your-cluster:6443
✅ Deployment Status:
NAME                               READY   STATUS    RESTARTS   AGE
swasthasathi-app-xxxxxxxxx-xxxxx   1/1     Running   0          30s
swasthasathi-app-xxxxxxxxx-xxxxx   1/1     Running   0          30s  
swasthasathi-app-xxxxxxxxx-xxxxx   1/1     Running   0          30s
```

## 🆘 **Still Having Issues?**

1. **Share your kubeconfig structure** (remove sensitive data)
2. **Check Jenkins agent logs** for more details
3. **Verify Kubernetes cluster health**
4. **Test manual kubectl from Jenkins agent**

Choose **Option 1** first, as it's the most straightforward. If that doesn't work, try **Option 2** with service account tokens.
