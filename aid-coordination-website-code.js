// File structure for the Next.js frontend

// pages/index.js - Home Page
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import FeaturedCauses from '../components/FeaturedCauses';
import SuccessStories from '../components/SuccessStories';
import Statistics from '../components/Statistics';

export default function Home() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    // Fetch statistics from API
    fetch('/api/statistics')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div className="container mx-auto px-4">
      <Head>
        <title>Aid Coordination Platform</title>
        <meta name="description" content="Connecting donors with those in need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="py-10">
        <section className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Connect, Support, Empower</h1>
          <p className="text-xl mb-8">Directly connect with people and causes that need your support</p>
          <div className="flex justify-center space-x-4">
            <Link href="/collective-aid" className="bg-blue-600 text-white px-6 py-2 rounded-md">
              Collective Causes
            </Link>
            <Link href="/individual-aid" className="bg-green-600 text-white px-6 py-2 rounded-md">
              Individual Aid
            </Link>
          </div>
        </section>

        {stats && <Statistics data={stats} />}
        
        <FeaturedCauses />
        
        <SuccessStories />
      </main>
    </div>
  );
}

// pages/collective-aid.js - Collective Aid Page
import { useState, useEffect } from 'react';
import CauseCard from '../components/CauseCard';
import { fetchCauses } from '../utils/api';

export default function CollectiveAid() {
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    fetchCauses()
      .then(data => {
        setCauses(data);
        setLoading(false);
      });
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Collective Causes</h1>
      <p className="mb-8">Browse causes that address national and socio-ecological issues.</p>
      
      {loading ? (
        <p>Loading causes...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {causes.map(cause => (
            <CauseCard key={cause.id} cause={cause} />
          ))}
        </div>
      )}
    </div>
  );
}

// pages/individual-aid.js - Individual Aid Page
import { useState, useEffect } from 'react';
import RequestCard from '../components/RequestCard';
import FilterOptions from '../components/FilterOptions';
import { fetchRequests } from '../utils/api';

export default function IndividualAid() {
  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ category: '', location: '', urgency: '' });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    fetchRequests(filters)
      .then(data => {
        setRequests(data);
        setLoading(false);
      });
  }, [filters]);
  
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Individual Aid Requests</h1>
      <p className="mb-8">Connect directly with individuals in need.</p>
      
      <FilterOptions 
        filters={filters} 
        onChange={newFilters => setFilters({...filters, ...newFilters})} 
      />
      
      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(request => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

// pages/dashboard.js - User Dashboard
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import DonorDashboard from '../components/dashboard/DonorDashboard';
import ReceiverDashboard from '../components/dashboard/ReceiverDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading || !user) {
    return <p>Loading...</p>;
  }
  
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>
      
      {user.role === 'donor' && <DonorDashboard user={user} />}
      {user.role === 'receiver' && <ReceiverDashboard user={user} />}
      {user.role === 'admin' && <AdminDashboard user={user} />}
    </div>
  );
}

// components/RequestCard.js
export default function RequestCard({ request }) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold">{request.title}</h3>
          <span className={`px-2 py-1 text-xs rounded ${
            request.urgency === 'high' ? 'bg-red-100 text-red-800' :
            request.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {request.urgency}
          </span>
        </div>
        <p className="text-gray-600 mb-4">{request.summary}</p>
        <div className="flex justify-between text-sm text-gray-500 mb-4">
          <span>{request.location}</span>
          <span>{request.category}</span>
        </div>
        <div className="mt-4">
          <button className="w-full bg-blue-600 text-white py-2 rounded-md">
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
