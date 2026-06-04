import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import FeaturedTurfs from '../components/FeaturedTurfs';
import UpcomingMatches from '../components/UpcomingMatches';
import HowItWorks from '../components/HowItWorks';
import StatsSection from '../components/StatsSection';
import { api } from '../services/api';

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const navigate = useNavigate();
  const [featuredTurfs, setFeaturedTurfs] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [turfsRes, matchesRes, statsRes] = await Promise.all([
        api.get('/turfs/featured?limit=10'),
        api.get('/matches/upcoming?limit=5'),
        api.get('/stats/platform')
      ]);

      setFeaturedTurfs(turfsRes.data.data);
      setUpcomingMatches(matchesRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch home page data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection onBookClick={() => navigate('/turfs')} onCreateClick={() => navigate('/match/create')} />

      {/* Featured Turfs */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-gray-900">Featured Turfs</h2>
          <FeaturedTurfs turfs={featuredTurfs} loading={loading} />
        </div>
      </section>

      {/* Upcoming Matches */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-gray-900">Live & Upcoming Matches</h2>
          <UpcomingMatches matches={upcomingMatches} loading={loading} />
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Statistics */}
      {stats && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-green-700">
          <div className="max-w-7xl mx-auto">
            <StatsSection stats={stats} />
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
