import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { initialCandidateData } from './wizard/wizardTypes';
import type { CandidateFormData } from './wizard/wizardTypes';
import { publicGetFullStatus, publicApplyFullCandidate } from '../../api/candidates';
import { LoadingSpinner, Button } from '../../components/ui';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { validatePreForm } from '../../lib/validatePreForm';
import { PublicShell } from '../../components/layout/PublicShell';

import { PersonalInfoForm } from './wizard/sections/PersonalInfoForm';
import { AddressForm } from './wizard/sections/AddressForm';
import { IdentityForm } from './wizard/sections/IdentityForm';
import { EducationForm } from './wizard/sections/EducationForm';
import { EmploymentForm } from './wizard/sections/EmploymentForm';
import { RecruitmentForm } from './wizard/sections/RecruitmentForm';
import { MedicalForm } from './wizard/sections/MedicalForm';

export default function PreFormPage() {
  const { token } = useParams<{ token: string }>();

  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CandidateFormData>(initialCandidateData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!token) {
      setStatusError('Missing token. Please use the link provided by your HR recruiter.');
      setLoading(false);
      return;
    }

    publicGetFullStatus(token)
      .then(res => {
        if (!res.is_awaiting_full_fill) {
          setStatusError('This candidate application form has already been submitted or is not yet open.');
        } else {
          setCandidateName(res.full_name);
          setFormData(prev => ({ ...prev, fullName: res.full_name }));
        }
        setLoading(false);
      })
      .catch(() => {
        setStatusError('Invalid candidate reference URL.');
        setLoading(false);
      });
  }, [token]);

  const handleUpdateField = (field: keyof CandidateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutofill = () => {
    const birthYear = 2000;
    const today = new Date();
    const dob = `${birthYear}-05-15`;
    let age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() - 4; // May
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < 15)) {
      age -= 1;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedJoining = tomorrow.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      nameAadhaar: prev.fullName || 'Rahul Sharma',
      gender: 'Male',
      dateOfBirth: dob,
      age: age.toString(),
      maritalStatus: 'Single',
      height: '175',
      weight: '70',
      bloodGroup: 'O+',
      religionCaste: 'Hindu / General',

      permHouseName: 'Villa 10',
      permPostOffice: 'Kochi H.O.',
      permLandmark: 'Near Metro Pillar 340',
      permDistrict: 'Ernakulam',
      permPinCode: '682024',

      sameAsPermanent: true,
      presHouseName: '',
      presPostOffice: '',
      presLandmark: '',
      presDistrict: '',
      presPinCode: '',

      aadhaarNumber: '999988887777',
      panNumber: 'ABCDE1234F',
      drivingLicenseNumber: 'KL0720230001234',
      passportNumber: 'Z1234567',

      class10School: 'St. Marys High School',
      class10Board: 'CBSE',
      class10Percentage: '85',
      class10PassingYear: '2016',
      class10Mode: 'Regular',

      class12School: 'St. Marys HSS',
      class12Stream: 'Science',
      class12Percentage: '82',
      class12PassingYear: '2018',
      class12Mode: 'Regular',

      gradCourse: 'B.Sc. Computer Science',
      gradCollege: 'Sacred Heart College',
      gradPercentage: '78',
      gradPassingYear: '2021',

      postGradCourse: '',
      postGradCollege: '',
      postGradPercentage: '',
      postGradPassingYear: '',

      languagesRead: 'English, Malayalam',
      languagesWrite: 'English, Malayalam',
      languagesSpeak: 'English, Hindi, Malayalam',

      previousExperience: true,
      prevCompanyName: 'Tata Consultancy Services',
      prevPosition: 'Junior Associate',
      totalExperience: '2 Years',
      expectedSalary: '25000',

      hasReference: true,
      refRole: 'Colleague',
      refName: 'Amit Patel',
      refPanchayat: 'Kochi',
      refContactNumber: '9876543211',

      sourceOfOpening: 'Walk-in',
      referredBy: '',
      preferredRegion: 'Ernakulam',
      expectedJoiningDate: expectedJoining,

      medicalRemarks: 'None',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const validationError = validatePreForm(formData);
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorText('');

    try {
      const { resumeFile: _resumeFile, resumeUrl: _resumeUrl, resumeFileObject: _resumeFileObject, profilePicture: _profilePicture, ...applicationData } = formData;
      const candidateObj = await publicApplyFullCandidate(token, applicationData);
      setSubmitSuccess(candidateObj.candidate_id);
    } catch (err: any) {
      setErrorText(err?.response?.data?.detail || err.message || 'Failed to submit application details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicShell maxWidth="2xl">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </PublicShell>
    );
  }

  if (statusError) {
    return (
      <PublicShell maxWidth="2xl">
        <div className="text-center py-8">
          <div className="status-icon-error">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Link unavailable</h2>
          <p className="text-text-secondary max-w-lg mx-auto">{statusError}</p>
        </div>
      </PublicShell>
    );
  }

  if (submitSuccess) {
    return (
      <PublicShell maxWidth="2xl">
        <motion.div 
          className="text-center py-16 sm:py-24 max-w-lg mx-auto px-6"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full w-24 h-24 mx-auto animate-pulse"></div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10 w-20 h-20 bg-background rounded-full p-1.5 shadow-lg flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-primary" strokeWidth={2.5} />
            </motion.div>
          </div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-3xl font-bold tracking-tight text-text-primary mb-3"
          >
            Application submitted
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-text-secondary text-lg leading-relaxed mb-8"
          >
            Thank you, <span className="font-semibold text-text-primary">{candidateName}</span>. Your pre-interview form is complete.
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-sm font-medium text-text-secondary px-4 py-3 bg-muted/50 rounded-xl"
          >
            Your recruiter will review your details and contact you about next steps.
          </motion.p>
        </motion.div>
      </PublicShell>
    );
  }

  return (
    <PublicShell maxWidth="2xl">
      <div className="page-card p-6 sm:p-8">
        <div className="mb-8 pb-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Pre-interview form</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Welcome, <span className="font-medium text-text-primary">{candidateName}</span>. Complete every section before submitting.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAutofill}
            className="self-start sm:self-center"
          >
            Autofill Dummy Data
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Personal details</h2>
            <PersonalInfoForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Address details</h2>
            <AddressForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Identity documents</h2>
            <IdentityForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Education</h2>
            <EducationForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Employment history</h2>
            <EmploymentForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Recruitment details</h2>
            <RecruitmentForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Medical and declaration</h2>
            <MedicalForm data={formData} update={handleUpdateField} />
          </section>

          <div className="pt-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {errorText && (
              <p role="alert" className="text-sm text-danger bg-danger/5 p-3 rounded-lg border border-danger/20 flex-1">{errorText}</p>
            )}
            <Button type="submit" className="w-full sm:w-auto sm:ml-auto h-10 px-8" isLoading={isSubmitting}>
              Submit application
            </Button>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}
