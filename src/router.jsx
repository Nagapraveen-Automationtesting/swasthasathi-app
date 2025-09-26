import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Reports from './pages/Reports/Reports';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { APP_BASE_PATH } from './assets/Constants';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { 
        path: '/', 
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ) 
      },
      {
        path: '/reports',
        element: (
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
], {
  basename: APP_BASE_PATH
});


export default function AppRouter() {
  return <RouterProvider router={router} />;
}
