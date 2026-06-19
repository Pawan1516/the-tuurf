import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { 
  CreditCard, ShieldCheck, Trophy, ChevronRight, CheckCircle2, 
  AlertCircle, ArrowLeft, Landmark, Wallet, Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';

export default function TournamentPayment() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('teamId');
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [tournament, setTournament] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    if (!id || !teamId) {
      toast.error("Missing tournament or team context");
      navigate('/tournaments');
      return;
    }
    fetchDetails();
  }, [id, teamId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [tRes, teamRes] = await Promise.all([
        apiClient.get(`/tournaments/${id}`),
        apiClient.get(`/teams/${teamId}`)
      ]);
      setTournament(tRes.data.tournament);
      setTeam(teamRes.data.team);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!window.Razorpay) {
      toast.error("Billing gateway not ready. Please try again.");
      return;
    }

    setPaying(true);
    try {
      const orderRes = await apiClient.post(`/tournaments/${id}/payment/create-order`, { 
        teamId 
      });

      if (!orderRes.data.success) {
        toast.error(orderRes.data.message || "Failed to create payment order");
        setPaying(false);
        return;
      }

      const options = {
        key: orderRes.data.keyId,
        amount: orderRes.data.order.amount,
        currency: orderRes.data.order.currency,
        name: "The Turf",
        description: `Entry Fee for ${tournament.name}`,
        order_id: orderRes.data.order.id,
        handler: async function (response) {
          try {
            setPaying(true);
            const verifyRes = await apiClient.post(`/tournaments/${id}/payment/verify`, {
              teamId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            if (verifyRes.data.success) {
              setPaymentSuccess(true);
              setPaymentDetails(response);
              toast.success("Entry Fee Paid Successfully! 🎉");
            } else {
              toast.error("Payment verification failed");
            }
          } catch (vErr) {
            toast.error("Error during payment verification");
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: user?.name || "Captain",
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: { color: "#10B981" }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Server error. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Loading checkout details...</p>
        </div>
      </div>
    );
  }

  if (!tournament || !team) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-black text-white uppercase mb-2">Invalid Context</h2>
          <p className="text-slate-400 text-sm mb-6">Could not load tournament or team registration context details.</p>
          <Link to="/tournaments" className="inline-flex items-center gap-2 bg-emerald-500 text-black font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial highlights */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-xl relative z-10">
        
        {/* Back Link */}
        {!paymentSuccess && (
          <Link to={`/tournaments/${id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest mb-6 transition-colors">
            <ArrowLeft size={14} />
            Back to Tournament
          </Link>
        )}

        {paymentSuccess ? (
          /* Success Screen */
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-emerald-500/30 rounded-[2.5rem] p-10 md:p-14 text-center shadow-2xl animate-fade-in">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
              <CheckCircle2 size={44} className="text-emerald-400" />
            </div>
            
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Registration Paid</p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-4 italic">Welcome to the Turf!</h1>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md mx-auto mb-10">
              Entry fee for team <strong className="text-white">{team.name}</strong> has been successfully processed. Your team is now registered and approved!
            </p>

            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 text-left space-y-3 mb-10">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transaction ID</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{paymentDetails?.razorpay_payment_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Order ID</span>
                <span className="text-xs font-black text-white font-mono">{paymentDetails?.razorpay_order_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Amount Paid</span>
                <span className="text-xs font-black text-white">₹{tournament.entryFee}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate(`/tournaments/${id}`)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs transition-transform active:scale-95 shadow-xl shadow-emerald-500/10"
            >
              Go to Tournament Dashboard
            </button>
          </div>
        ) : (
          /* Payment Summary Card */
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-850 rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Secure Checkout</span>
                <h1 className="text-xl font-black uppercase text-white mt-1">Tournament Entry</h1>
              </div>
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>

            <div className="p-8 space-y-6">
              {/* Summary item */}
              <div className="flex items-start gap-4 bg-slate-950/60 p-5 border border-slate-800 rounded-3xl">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-400">
                  <Trophy size={24} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tournament</span>
                  <p className="font-black text-base text-white mt-0.5">{tournament.name}</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5 capitalize">{tournament.matchFormat} · {tournament.tournamentType?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Team item */}
              <div className="flex items-start gap-4 bg-slate-950/60 p-5 border border-slate-800 rounded-3xl">
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-400 font-black text-lg">
                  {team.shortName?.[0] || team.name?.[0] || 'T'}
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Registering Team</span>
                  <p className="font-black text-base text-white mt-0.5">{team.name}</p>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{team.players?.length || 0} Members · captain: {team.captain?.name || 'You'}</p>
                </div>
              </div>

              {/* Bill Details */}
              <div className="space-y-3 bg-slate-950/30 p-5 border border-slate-850 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Breakdown</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Team Entry Fee</span>
                  <span className="font-black text-white">₹{tournament.entryFee}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Taxes & Gateway Fees</span>
                  <span className="font-black text-emerald-400">₹0 (Included)</span>
                </div>
                <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center text-sm font-black">
                  <span className="uppercase text-slate-300">Total Amount Due</span>
                  <span className="text-lg text-white">₹{tournament.entryFee}</span>
                </div>
              </div>

              {/* Security info */}
              <div className="flex items-center gap-3 bg-slate-950/20 p-4 border border-slate-850 rounded-2xl text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <Landmark size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Secure payment powered by Razorpay. 100% encrypted transaction.</span>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={paying}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black py-5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {paying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Pay Entry Fee & Confirm Slot
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
