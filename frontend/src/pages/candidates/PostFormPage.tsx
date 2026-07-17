import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { fetchPublicPostForm, submitPublicPostForm } from '../../api/candidates';
import { Button, Input, Select } from '../../components/ui';
import { toast } from 'sonner';

export default function PostFormPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (!token) return;
    fetchPublicPostForm(token)
      .then((data) => {
        setCandidateName(data.candidate.full_name);
        if (data.is_submitted) {
          setIsSubmitted(true);
        } else {
          const prefill = data.raw_data || {};
          reset({
            languagesWrite: prefill.languagesWrite || prefill.languagesRead || '', 
            languagesSpeak: prefill.languagesSpeak || '',
            languagesOther: prefill.languagesOther || '',
            drive2Wheeler: prefill.drive2Wheeler || false,
            drive3Wheeler: prefill.drive3Wheeler || false,
            drive4Wheeler: prefill.drive4Wheeler || false,
            driveHeavy: prefill.driveHeavy || false,
            gradMode: prefill.gradMode || '',
            postGradMode: prefill.postGradMode || '',
            compWord: prefill.compWord || false,
            compExcel: prefill.compExcel || false,
            compPowerPoint: prefill.compPowerPoint || false,
            compTally: prefill.compTally || false,
            compOther: prefill.compOther || false,
            softwareCerts: prefill.softwareCerts || '',
            
            fatherName: prefill.fatherName || '',
            fatherAge: prefill.fatherAge || '',
            fatherOccupation: prefill.fatherOccupation || '',
            fatherCompany: prefill.fatherCompany || '',
            fatherPhone: prefill.fatherPhone || '',

            motherName: prefill.motherName || '',
            motherAge: prefill.motherAge || '',
            motherOccupation: prefill.motherOccupation || '',
            motherCompany: prefill.motherCompany || '',
            motherPhone: prefill.motherPhone || '',

            spouseName: prefill.spouseName || '',
            spouseAge: prefill.spouseAge || '',
            spouseOccupation: prefill.spouseOccupation || '',
            spouseCompany: prefill.spouseCompany || '',
            spousePhone: prefill.spousePhone || '',

            child1Relation: prefill.child1Relation || '',
            child1Name: prefill.child1Name || '',
            child1Age: prefill.child1Age || '',
            child1Occupation: prefill.child1Occupation || '',
            child1Company: prefill.child1Company || '',
            child1Phone: prefill.child1Phone || '',

            child2Relation: prefill.child2Relation || '',
            child2Name: prefill.child2Name || '',
            child2Age: prefill.child2Age || '',
            child2Occupation: prefill.child2Occupation || '',
            child2Company: prefill.child2Company || '',
            child2Phone: prefill.child2Phone || '',
            
            child3Relation: prefill.child3Relation || '',
            child3Name: prefill.child3Name || '',
            child3Age: prefill.child3Age || '',
            child3Occupation: prefill.child3Occupation || '',
            child3Company: prefill.child3Company || '',
            child3Phone: prefill.child3Phone || '',

            sibling1Relation: prefill.sibling1Relation || '',
            sibling1Name: prefill.sibling1Name || '',
            sibling1Age: prefill.sibling1Age || '',
            sibling1Occupation: prefill.sibling1Occupation || '',
            sibling1Company: prefill.sibling1Company || '',
            sibling1Phone: prefill.sibling1Phone || '',

            sibling2Relation: prefill.sibling2Relation || '',
            sibling2Name: prefill.sibling2Name || '',
            sibling2Age: prefill.sibling2Age || '',
            sibling2Occupation: prefill.sibling2Occupation || '',
            sibling2Company: prefill.sibling2Company || '',
            sibling2Phone: prefill.sibling2Phone || '',

            sibling3Relation: prefill.sibling3Relation || '',
            sibling3Name: prefill.sibling3Name || '',
            sibling3Age: prefill.sibling3Age || '',
            sibling3Occupation: prefill.sibling3Occupation || '',
            sibling3Company: prefill.sibling3Company || '',
            sibling3Phone: prefill.sibling3Phone || '',

            hobbies: prefill.hobbies || '',
            achievements: prefill.achievements || '',

            emergency1Relation: prefill.emergency1Relation || '',
            emergency1Name: prefill.emergency1Name || '',
            emergency1Address: prefill.emergency1Address || '',
            emergency1Contact: prefill.emergency1Contact || '',

            emergency2Relation: prefill.emergency2Relation || '',
            emergency2Name: prefill.emergency2Name || '',
            emergency2Address: prefill.emergency2Address || '',
            emergency2Contact: prefill.emergency2Contact || '',

            prev1Reporting: prefill.prev1Reporting || '',
            prev1From: prefill.prev1From || '',
            prev1To: prefill.prev1To || '',
            prev1Salary: prefill.prev1Salary || prefill.expectedSalary || '',
            prev1Reason: prefill.prev1Reason || '',

            prev2Name: prefill.prev2Name || '',
            prev2Position: prefill.prev2Position || '',
            prev2Reporting: prefill.prev2Reporting || '',
            prev2From: prefill.prev2From || '',
            prev2To: prefill.prev2To || '',
            prev2Salary: prefill.prev2Salary || '',
            prev2Reason: prefill.prev2Reason || '',

            prev3Name: prefill.prev3Name || '',
            prev3Position: prefill.prev3Position || '',
            prev3Reporting: prefill.prev3Reporting || '',
            prev3From: prefill.prev3From || '',
            prev3To: prefill.prev3To || '',
            prev3Salary: prefill.prev3Salary || '',
            prev3Reason: prefill.prev3Reason || '',

            prev4Name: prefill.prev4Name || '',
            prev4Position: prefill.prev4Position || '',
            prev4Reporting: prefill.prev4Reporting || '',
            prev4From: prefill.prev4From || '',
            prev4To: prefill.prev4To || '',
            prev4Salary: prefill.prev4Salary || '',
            prev4Reason: prefill.prev4Reason || '',
            
            facebookUrl: prefill.facebookUrl || '',
            instagramUrl: prefill.instagramUrl || '',
            twitterUrl: prefill.twitterUrl || '',
          });
        }
      })
      .catch(() => {
        toast.error("Invalid or expired link");
      })
      .finally(() => setLoading(false));
  }, [token, reset]);

  const onSubmit = async (data: any) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await submitPublicPostForm(token, data);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (error) {
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You, {candidateName}!</h2>
          <p className="text-gray-600 mb-8">
            Your final post-interview details have been securely submitted to Nippon Toyota.
          </p>
        </div>
      </div>
    );
  }

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Post-Interview Application Form</h1>
          <p className="text-gray-600">Please provide the following additional details to complete your profile, {candidateName}.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <Section title="General Information">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language Known (Write)</label>
              <Input {...register('languagesWrite')} placeholder="e.g. English, Hindi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language Known (Speak)</label>
              <Input {...register('languagesSpeak')} placeholder="e.g. English, Hindi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Languages Known</label>
              <Input {...register('languagesOther')} placeholder="e.g. Malayalam, Tamil" />
            </div>
            
            <div className="md:col-span-2 space-y-4 pt-4">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Driving Confidence</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('drive2Wheeler')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">2 Wheeler</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('drive3Wheeler')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">3 Wheeler</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('drive4Wheeler')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">4 Wheeler</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('driveHeavy')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">Heavy Vehicles</span>
                </label>
              </div>
            </div>
          </Section>

          <Section title="Education Mode & Computer Skills">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Graduation/Diploma Mode</label>
              <Select {...register('gradMode')}>
                <option value="">Select Mode</option>
                <option value="Regular">Regular</option>
                <option value="Private">Private</option>
                <option value="Correspondence">Correspondence</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Post Graduation Mode</label>
              <Select {...register('postGradMode')}>
                <option value="">Select Mode</option>
                <option value="Regular">Regular</option>
                <option value="Private">Private</option>
                <option value="Correspondence">Correspondence</option>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-4 pt-4">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Computer Knowledge</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('compWord')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">Word</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('compExcel')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">Excel</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('compPowerPoint')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">PowerPoint</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('compTally')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">Tally</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...register('compOther')} className="rounded border-gray-300 text-primary" />
                  <span className="text-sm text-gray-700">Other</span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Software Certifications (if any)</label>
              <Input {...register('softwareCerts')} placeholder="e.g. AutoCAD, SAP" />
            </div>
          </Section>

          <Section title="Family Details: Parents & Spouse">
            <div className="space-y-4 border p-4 rounded-md">
              <h4 className="font-semibold text-sm">Father</h4>
              <Input {...register('fatherName')} placeholder="Name" />
              <div className="grid grid-cols-2 gap-4">
                <Input {...register('fatherAge')} placeholder="Age" />
                <Input {...register('fatherPhone')} placeholder="Mobile Number" />
              </div>
              <Input {...register('fatherOccupation')} placeholder="Occupation" />
              <Input {...register('fatherCompany')} placeholder="Company Name" />
            </div>
            
            <div className="space-y-4 border p-4 rounded-md">
              <h4 className="font-semibold text-sm">Mother</h4>
              <Input {...register('motherName')} placeholder="Name" />
              <div className="grid grid-cols-2 gap-4">
                <Input {...register('motherAge')} placeholder="Age" />
                <Input {...register('motherPhone')} placeholder="Mobile Number" />
              </div>
              <Input {...register('motherOccupation')} placeholder="Occupation (House Wife/Working)" />
              <Input {...register('motherCompany')} placeholder="Company Name (If working)" />
            </div>

            <div className="space-y-4 border p-4 rounded-md md:col-span-2">
              <h4 className="font-semibold text-sm">Spouse</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input {...register('spouseName')} placeholder="Name" />
                <div className="grid grid-cols-2 gap-4">
                  <Input {...register('spouseAge')} placeholder="Age" />
                  <Input {...register('spousePhone')} placeholder="Mobile Number" />
                </div>
                <Input {...register('spouseOccupation')} placeholder="Occupation" />
                <Input {...register('spouseCompany')} placeholder="Company Name (If working)" />
              </div>
            </div>
          </Section>

          <Section title="Family Details: Children">
            {[1, 2, 3].map((num) => (
              <div key={num} className="space-y-4 border p-4 rounded-md">
                <h4 className="font-semibold text-sm">Child {num}</h4>
                <Select {...register(`child${num}Relation`)}>
                  <option value="">Select Relation</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                </Select>
                <Input {...register(`child${num}Name`)} placeholder="Name" />
                <Input {...register(`child${num}Age`)} placeholder="Age" />
                <Input {...register(`child${num}Occupation`)} placeholder="Occupation (Student/Other)" />
                <Input {...register(`child${num}Company`)} placeholder="Institution / Company Name" />
                <Input {...register(`child${num}Phone`)} placeholder="Mobile Number" />
              </div>
            ))}
          </Section>

          <Section title="Family Details: Siblings">
            {[1, 2, 3].map((num) => (
              <div key={num} className="space-y-4 border p-4 rounded-md">
                <h4 className="font-semibold text-sm">Sibling {num}</h4>
                <Select {...register(`sibling${num}Relation`)}>
                  <option value="">Select Relation</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                </Select>
                <Input {...register(`sibling${num}Name`)} placeholder="Name" />
                <Input {...register(`sibling${num}Age`)} placeholder="Age" />
                <Input {...register(`sibling${num}Occupation`)} placeholder="Occupation" />
                <Input {...register(`sibling${num}Company`)} placeholder="Company Name" />
                <Input {...register(`sibling${num}Phone`)} placeholder="Mobile Number" />
              </div>
            ))}
          </Section>

          <Section title="Emergency Contacts">
            <div className="space-y-4 border p-4 rounded-md">
              <h4 className="font-semibold text-sm">Emergency Contact 1</h4>
              <Input {...register('emergency1Relation')} placeholder="Relation (Family/Friends/Neighbour)" />
              <Input {...register('emergency1Name')} placeholder="Name" />
              <Input {...register('emergency1Contact')} placeholder="Contact Details (Phone)" />
              <textarea {...register('emergency1Address')} placeholder="Full Address" className="w-full rounded-md border border-gray-300 p-2 h-20" />
            </div>
            <div className="space-y-4 border p-4 rounded-md">
              <h4 className="font-semibold text-sm">Emergency Contact 2</h4>
              <Input {...register('emergency2Relation')} placeholder="Relation (Family/Friends/Neighbour)" />
              <Input {...register('emergency2Name')} placeholder="Name" />
              <Input {...register('emergency2Contact')} placeholder="Contact Details (Phone)" />
              <textarea {...register('emergency2Address')} placeholder="Full Address" className="w-full rounded-md border border-gray-300 p-2 h-20" />
            </div>
          </Section>

          <Section title="Employment History (Previous Companies)">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="space-y-4 border p-4 rounded-md md:col-span-2">
                <h4 className="font-semibold text-sm">Previous Company {num} {num === 1 && '(Most Recent)'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {num > 1 && <Input {...register(`prev${num}Name`)} placeholder="Company Name and Address" />}
                  {num > 1 && <Input {...register(`prev${num}Position`)} placeholder="Position Held" />}
                  <Input {...register(`prev${num}Reporting`)} placeholder="Reporting Person (Name, Desig, Contact)" />
                  <Input {...register(`prev${num}Salary`)} placeholder="Last Drawn Salary & Allowances" />
                  <Input {...register(`prev${num}From`)} placeholder="Period Employed (From) - e.g. Jan 2020" />
                  <Input {...register(`prev${num}To`)} placeholder="Period Employed (To) - e.g. Dec 2022" />
                  <div className="md:col-span-2">
                    <Input {...register(`prev${num}Reason`)} placeholder="Reason For Leaving" />
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <Section title="Social Media & Additional">
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Username/Link</label>
                  <Input {...register('facebookUrl')} placeholder="facebook.com/username" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Username/Link</label>
                  <Input {...register('instagramUrl')} placeholder="instagram.com/username" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Username/Link</label>
                  <Input {...register('twitterUrl')} placeholder="twitter.com/username" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies</label>
                  <textarea {...register('hobbies')} placeholder="Your hobbies" className="w-full rounded-md border border-gray-300 p-2 h-20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Achievements (if any)</label>
                  <textarea {...register('achievements')} placeholder="Awards, recognition, etc." className="w-full rounded-md border border-gray-300 p-2 h-20" />
                </div>
              </div>
            </div>
          </Section>

          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto min-w-[200px] h-12 text-lg">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {submitting ? 'Submitting...' : 'Submit Final Form'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
