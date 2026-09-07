'use client';

import React, { useState, useEffect } from 'react';
import { ApplicationStatus, JobApplication, KanbanStatus, toKanbanStatus } from '@/types';
import { Modal, Input, Textarea, Select, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Briefcase,
  Building2,
  Link as LinkIcon,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  Mail,
} from 'lucide-react';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: JobApplication | null;
  initialStatus?: KanbanStatus | ApplicationStatus;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'wishlist', label: 'Wishlist (Saved to Apply)' },
  { value: 'applied', label: 'Applied (Submitted)' },
  { value: 'interviewing', label: 'Interviewing (Tests / Screens / Rounds)' },
  { value: 'offer', label: 'Offer Received' },
  { value: 'rejected', label: 'Rejected' },
];

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  initialStatus = 'applied',
}) => {
  const { addApplication, updateApplication, resumes, coverLetters } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [applicationDate, setApplicationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState<'Remote' | 'Hybrid' | 'On-site'>('Hybrid');
  const [salary, setSalary] = useState('');
  const [tailoredResumeId, setTailoredResumeId] = useState('');
  const [coverLetterId, setCoverLetterId] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setCompanyName(initialData.companyName);
      setJobTitle(initialData.jobTitle);
      setJobDescription(initialData.jobDescription || '');
      setJobUrl(initialData.jobUrl || '');
      setApplicationDate(initialData.applicationDate || new Date().toISOString().split('T')[0]);
      setStatus(toKanbanStatus(initialData.status));
      setNotes(initialData.notes || '');
      setLocation(initialData.location || '');
      setWorkType(initialData.workType || 'Hybrid');
      setSalary(initialData.salary || '');
      setTailoredResumeId(initialData.tailoredResumeId || '');
      setCoverLetterId(initialData.coverLetterId || '');
    } else {
      // Reset form
      setCompanyName('');
      setJobTitle('');
      setJobDescription('');
      setJobUrl('');
      setApplicationDate(new Date().toISOString().split('T')[0]);
      setStatus(toKanbanStatus(initialStatus));
      setNotes('');
      setLocation('');
      setWorkType('Hybrid');
      setSalary('');
      setTailoredResumeId('');
      setCoverLetterId('');
    }
    setErrors({});
  }, [initialData, initialStatus, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!jobTitle.trim()) newErrors.jobTitle = 'Job title is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (initialData) {
      updateApplication(initialData.id, {
        companyName,
        jobTitle,
        jobDescription,
        jobUrl,
        applicationDate,
        status,
        notes,
        location,
        workType,
        salary,
        tailoredResumeId: tailoredResumeId || undefined,
        coverLetterId: coverLetterId || undefined,
      });
    } else {
      addApplication({
        companyName,
        jobTitle,
        jobDescription,
        jobUrl,
        applicationDate,
        status,
        notes,
        location,
        workType,
        salary,
        tailoredResumeId: tailoredResumeId || undefined,
        coverLetterId: coverLetterId || undefined,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Application' : 'Add New Application'}
      description="Track stages, compensation, attached resume versions, and interview notes."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name *"
            placeholder="e.g. Canva, Atlassian, Stripe"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            error={errors.companyName}
            leftIcon={<Building2 className="w-4 h-4" />}
          />

          <Input
            label="Job Title *"
            placeholder="e.g. Technology Graduate, Junior Full Stack Engineer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            error={errors.jobTitle}
            leftIcon={<Briefcase className="w-4 h-4" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Kanban Stage"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          />

          <Input
            label="Application Date"
            type="date"
            value={applicationDate}
            onChange={(e) => setApplicationDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />

          <Select
            label="Workplace Arrangement"
            options={[
              { value: 'Hybrid', label: 'Hybrid' },
              { value: 'Remote', label: 'Remote' },
              { value: 'On-site', label: 'On-site' },
            ]}
            value={workType}
            onChange={(e) => setWorkType(e.target.value as 'Remote' | 'Hybrid' | 'On-site')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Job Listing URL"
            type="url"
            placeholder="https://..."
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            leftIcon={<LinkIcon className="w-4 h-4" />}
          />

          <Input
            label="Location"
            placeholder="e.g. Sydney, NSW"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4" />}
          />

          <Input
            label="Target Salary / Compensation"
            placeholder="e.g. $95,000 + Super"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
        </div>

        {/* Linked Resume & Cover Letter options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Attach Tailored Resume</span>
            </label>
            <select
              value={tailoredResumeId}
              onChange={(e) => setTailoredResumeId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None / Unattached</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.isMaster ? '(Master)' : '(Tailored)'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-violet-500" />
              <span>Attach Cover Letter</span>
            </label>
            <select
              value={coverLetterId}
              onChange={(e) => setCoverLetterId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None / Unattached</option>
              {coverLetters.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.targetCompany} - {cl.targetPosition}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Textarea
          label="Job Description (Optional)"
          placeholder="Paste the job advertisement or key requirements. ApplyIQ AI will analyze candidate fit and requirements."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={4}
        />

        <Textarea
          label="Notes & Interview Logs"
          placeholder="e.g. Recruiter phone screen scheduled for Thursday, referral from colleague, coding test due in 3 days."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Sparkles className="w-4 h-4" />}
          >
            {initialData ? 'Save Changes' : 'Create Application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
