import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CheckCircle2, 
  Download, 
  Share2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CreditCard, 
  Trophy, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const QRCodeDisplay = ({ token, expiry }) => {
  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
      <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 mb-6 flex items-center gap-2">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Official Access Pass</span>
      </div>
      
      <div className="p-4 bg-white border-4 border-slate-900 rounded-3xl mb-6 shadow-xl shadow-slate-200">
        <QRCodeSVG value={token || "TRF-PENDING"} size={160} level="H" includeMargin={true} />
      </div>

      <div className="text-center space-y-2">
        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Scan at counter for entry</p>
        <div className="flex items-center justify-center gap-2 text-[9px] font-black text-red-500 uppercase tracking-tighter">
            <Clock size={10} />
            <span>Valid Until: {new Date(expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export const WhatsAppReceiptButton = ({ receipt }) => {
  const handleShare = () => {
    const text = `✅ Booking Confirmed! | The Turf\n📅 Date: ${new Date(receipt.slot.date).toLocaleDateString()}\n⏰ Time: ${receipt.slot.start_time} – ${receipt.slot.end_time}\n🏟️ Sport: ${receipt.slot.sport}\n💰 Paid: ₹${receipt.payment.amount}\n🎟️ Show QR at counter for entry\nSee you on the turf! 🏏⚽`;
    window.open(`https://wa.me/${receipt.player.phone.replace('+', '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <button 
      onClick={handleShare}
      className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-green-500/20"
    >
      <Share2 size={16} />
      Share on WhatsApp
    </button>
  );
};

export const BookingReceiptModal = ({ receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Receipt Details */}
        <div className="flex-1 p-8 md:p-10 border-r border-slate-50">
            <div className="flex items-center gap-4 mb-8">
                <img 
                    src="/logo.png" 
                    alt="The Turf" 
                    className="h-16 w-auto object-contain bg-emerald-50 p-2 rounded-2xl shadow-sm border border-emerald-100"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png';
                    }}
                />
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Booking Confirmed</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Receipt No: {receipt.receipt_id}</p>
                </div>
            </div>

            <div className="space-y-8">
                <section>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Venue & Slot</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                            <Calendar size={14} className="text-slate-400 mb-2" />
                            <p className="text-[10px] font-black text-slate-900 uppercase">{new Date(receipt.slot.date).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                            <Clock size={14} className="text-slate-400 mb-2" />
                            <p className="text-[10px] font-black text-slate-900 uppercase">{receipt.slot.start_time} - {receipt.slot.end_time}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Payment Summary</h4>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100/50 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                            <span>Slot Price</span>
                            <span>₹{receipt.payment.totalAmount || 1000}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                            <span>Taxes & Fees</span>
                            <span>₹0.00</span>
                        </div>
                        <hr className="border-slate-200" />
                        <div className="flex justify-between items-center text-sm font-black uppercase text-slate-900 pt-1">
                            <span>Total Paid</span>
                            <span className="text-emerald-600">₹{receipt.payment.amount}</span>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Trophy size={80} /></div>
                    <div className="flex items-center gap-3 mb-1 relative z-10">
                        <Trophy size={14} className="text-yellow-400" />
                        <h5 className="text-[10px] font-black uppercase tracking-widest">IARE Leaderboard Status</h5>
                    </div>
                    <div className="flex items-end justify-between relative z-10">
                        <div>
                            <p className="text-2xl font-black tracking-tighter text-yellow-400">{receipt.player_stats.career_points} <span className="text-xs text-white/50">PTS</span></p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Rank #{receipt.player_stats.leaderboard_rank}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs font-black uppercase tracking-tight">{receipt.player_stats.total_bookings} Bookings</p>
                        </div>
                    </div>
                </section>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex gap-3">
                     <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
                        <Download size={16} /> PDF
                     </button>
                     <WhatsAppReceiptButton receipt={receipt} />
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-all"
                >
                    Dismiss Receipt
                </button>
            </div>
        </div>

        {/* Right Side: QR Pass */}
        <div className="w-full md:w-[220px] bg-slate-50 p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-100">
            <QRCodeDisplay token={receipt.qr.token} expiry={receipt.qr.valid_until} />
            
            <div className="mt-8 space-y-4">
                <div className="flex gap-2 items-start">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight leading-relaxed">Arrive 10 minutes early</p>
                </div>
                <div className="flex gap-2 items-start">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight leading-relaxed">Present QR pass at gate</p>
                </div>
                <div className="flex gap-2 items-start opacity-50">
                    <AlertCircle size={12} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight leading-relaxed">No-Refund Policy</p>
                </div>
            </div>

            <div className="mt-auto pt-8 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Live Pass Active</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export const ReceiptCard = ({ receipt, onClick }) => {
    return (
        <div 
          onClick={onClick}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{new Date(receipt.slot.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{receipt.slot.start_time}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Confirmed</span>
                    <span className="text-[6px] font-black text-slate-300 uppercase mt-1">ID: {receipt.receipt_id}</span>
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                    <MapPin size={10} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{receipt.venue?.location || 'Miyapur, Hyderabad'}</span>
                </div>
                <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Receipt</span>
                    <ChevronRight size={10} className="text-emerald-600" />
                </div>
            </div>
        </div>
    );
};
