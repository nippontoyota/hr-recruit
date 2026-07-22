import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCandidatePortal, submitCandidatePortalResponse, type CandidatePortalOut } from '../../api/portal';
import { LoadingSpinner, Button } from '../../components/ui';
import { CheckCircle2, XCircle, Calendar, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractError } from '../../lib/utils';
import { motion } from 'framer-motion';

export default function CandidatePortalPage() {
  const { token } = useParams<{ token: string }>();
  const [portalData, setPortalData] = useState<CandidatePortalOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPortal = async () => {
    if (!token) return;
    try {
      const data = await getCandidatePortal(token);
      setPortalData(data);
    } catch (err) {
      toast.error(extractError(err, 'Failed to load portal'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, [token]);

  const handleResponse = async (action: 'INTERVIEW_CONFIRM' | 'INTERVIEW_DECLINE' | 'OFFER_ACCEPT' | 'OFFER_DECLINE', evalId?: string) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await submitCandidatePortalResponse(token, action, evalId);
      toast.success('Your response has been recorded.');
      fetchPortal();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit response'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h2>
          <p className="text-gray-500">The link you followed is no longer active.</p>
        </div>
      </div>
    );
  }

  const pendingInterviews = portalData.evaluations.filter(e => !e.candidate_response);
  const respondedInterviews = portalData.evaluations.filter(e => e.candidate_response);

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-black selection:text-white pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm backdrop-blur-xl bg-white/80">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-black" />
            <span className="font-bold text-lg tracking-tight">Nippon Toyota HR</span>
          </div>
          <div className="text-sm font-medium text-gray-500">
            Candidate Portal
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-12 space-y-12">
        {/* Welcome Section / Profile Header */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex flex-col gap-4">
            
            {/* Top row: Photo and Name */}
            <div className="flex items-start gap-4">
              <div className="relative group shrink-0">
                {portalData.photo_url ? (
                  <img src={portalData.photo_url} alt="Profile" className="w-28 h-36 rounded-none object-cover border border-gray-200 bg-white" />
                ) : (
                  <div className="w-28 h-36 rounded-none bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 font-bold text-3xl">
                    {portalData.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">{portalData.full_name}</h1>
            </div>

            {/* Bottom row: Details below photo and name */}
            <div className="flex flex-col gap-2 mt-2">
              {portalData.position_applied_for && (
                <div className="text-lg">
                  <span className="text-gray-500 font-medium">Applying for: </span>
                  <strong className="text-gray-900">{portalData.position_applied_for}</strong>
                </div>
              )}

              <div className="flex flex-col gap-2 text-lg text-gray-500 mt-2">
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span className="text-gray-900 font-medium">+91 {portalData.phone}</span>
                </span>
                {portalData.email && (
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <span className="text-gray-900 font-medium">{portalData.email}</span>
                  </span>
                )}
                {portalData.branch_location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 shrink-0" />
                    <span className="text-gray-900 font-medium">{portalData.branch_location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Interviews */}
        {pendingInterviews.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Action Required <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
            </h3>
            
            <div className="grid gap-6">
              {pendingInterviews.map((ev) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={ev.id} 
                  className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4 flex-1">
                      <div>
                        <div className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wider">Interview Invitation</div>
                        <h4 className="text-xl font-bold text-gray-900">{ev.type.replace(/_/g, ' ')}</h4>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Date & Time</div>
                            <div className="font-medium text-gray-900">
                              {ev.scheduled_time ? new Date(ev.scheduled_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'To be decided'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Mode & Location</div>
                            <div className="font-medium text-gray-900">
                              {ev.interview_mode === 'PHYSICAL' ? 'Walk-in / Physical' : 'Online / Virtual'}
                            </div>
                            {ev.location_or_link && (
                              <div className="text-sm text-gray-500 mt-1 truncate max-w-[200px]" title={ev.location_or_link}>
                                {ev.location_or_link}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                      <Button 
                        onClick={() => handleResponse('INTERVIEW_CONFIRM', ev.id)}
                        disabled={submitting}
                        className="bg-black hover:bg-gray-800 text-white font-bold h-12 px-6 rounded-xl w-full"
                      >
                        Confirm Attendance
                      </Button>
                      <Button 
                        onClick={() => handleResponse('INTERVIEW_DECLINE', ev.id)}
                        disabled={submitting}
                        variant="ghost"
                        className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold h-12 px-6 rounded-xl w-full border border-gray-200"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Past/Responded Interviews */}
        {respondedInterviews.length > 0 && (
          <div className="space-y-6 pt-8">
            <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4">
              Your Interview Schedule
            </h3>
            <div className="grid gap-4">
              {respondedInterviews.map((ev) => (
                <div key={ev.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{ev.type.replace(/_/g, ' ')}</h4>
                    <p className="text-sm text-gray-500">
                      {ev.scheduled_time ? new Date(ev.scheduled_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}
                    </p>
                  </div>
                  <div>
                    {ev.candidate_response === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-bold border border-green-200/50">
                        <CheckCircle2 className="w-4 h-4" /> Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-bold border border-red-200/50">
                        <XCircle className="w-4 h-4" /> Declined
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
