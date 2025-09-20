import { useAuth } from '../../contexts/AuthContext'

export default function Reports() {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📊 Reports Dashboard</h1>
      <p>Welcome, <strong>{user?.email}</strong>!</p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Recent Activity</h2>
        <ul>
          <li>✅ Logged in successfully</li>
          <li>📁 Accessed secure reports</li>
          <li>🔐 Authenticated via context</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>System Metrics</h2>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <h3>Uptime</h3>
            <p>99.98%</p>
          </div>
          <div>
            <h3>Requests</h3>
            <p>1,245 today</p>
          </div>
          <div>
            <h3>Errors</h3>
            <p>2 (handled)</p>
          </div>
        </div>
      </section>
    </div>
  );
}
