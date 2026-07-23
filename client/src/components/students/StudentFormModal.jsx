import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import { Modal, Field, Spinner } from '../ui/Primitives';
import { studentApi, settingsApi } from '../../api/services';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Business Administration'];
const GRADES = [
  'Nursery', 'LKG', 'UKG',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
];
const STREAMS = ['Science', 'Commerce', 'Arts'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'DROPPED'];

const StudentFormModal = ({ open, onClose, student }) => {
  const isEdit = Boolean(student);
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const institutionType = settingsData?.data?.data?.institutionType || 'COLLEGE';
  const isSchool = institutionType === 'SCHOOL';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const grade = watch('grade');
  const showStream = isSchool && ['9th', '10th', '11th', '12th'].includes(grade);

  useEffect(() => {
    if (open) {
      reset(
        student
          ? {
              ...student,
              dob: student.dob ? student.dob.substring(0, 10) : '',
            }
          : { gender: 'MALE', status: 'ACTIVE', academicSession: '2025-2026' }
      );
      setPhotoPreview(student?.photoUrl || null);
      setPhotoFile(null);
    }
  }, [open, student, reset]);

  const mutation = useMutation({
    mutationFn: (formData) =>
      isEdit ? studentApi.update(student.id, formData) : studentApi.create(formData),
    onSuccess: () => {
      toast.success(isEdit ? 'Student updated' : 'Student created');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Something went wrong');
    },
  });

  const onSubmit = (values) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') formData.append(key, value);
    });
    if (photoFile) formData.append('photo', photoFile);
    mutation.mutate(formData);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Student' : 'Add New Student'} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-slate-400" />
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={16} className="text-white" />
            </div>
          </label>
          <p className="text-xs text-slate-500">Upload a student photo (JPG/PNG, max 3MB)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.firstName?.message}>
            <input className="input" {...register('firstName', { required: 'Required' })} />
          </Field>
          <Field label="Last Name" required error={errors.lastName?.message}>
            <input className="input" {...register('lastName', { required: 'Required' })} />
          </Field>
          <Field label="Father's Name" required error={errors.fathersName?.message}>
            <input className="input" {...register('fathersName', { required: 'Required' })} />
          </Field>
          <Field label="Mother's Name" required error={errors.mothersName?.message}>
            <input className="input" {...register('mothersName', { required: 'Required' })} />
          </Field>
          <Field label="Date of Birth" required error={errors.dob?.message}>
            <input type="date" className="input" {...register('dob', { required: 'Required' })} />
          </Field>
          <Field label="Gender">
            <select className="input" {...register('gender')}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mobile Number" required error={errors.mobile?.message}>
            <input className="input" {...register('mobile', { required: 'Required' })} />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <input type="email" className="input" {...register('email', { required: 'Required' })} />
          </Field>
          <Field label="Roll Number" required error={errors.rollNumber?.message}>
            <input className="input" {...register('rollNumber', { required: 'Required' })} />
          </Field>
          <Field label="Enrollment Number" required error={errors.enrollmentNumber?.message}>
            <input className="input" {...register('enrollmentNumber', { required: 'Required' })} />
          </Field>
          <Field label="Aadhaar Number" error={errors.aadharNumber?.message}>
            <input
              className="input"
              placeholder="12-digit number"
              maxLength={12}
              {...register('aadharNumber', {
                pattern: { value: /^\d{12}$/, message: 'Must be exactly 12 digits' },
              })}
            />
          </Field>

          {isSchool ? (
            <>
              <Field label="Class / Grade" required error={errors.grade?.message}>
                <select className="input" {...register('grade', { required: 'Required' })}>
                  <option value="">Select class</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              {showStream && (
                <Field label="Stream">
                  <select className="input" {...register('stream')}>
                    <option value="">Select stream</option>
                    {STREAMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          ) : (
            <>
              <Field label="Department" required error={errors.department?.message}>
                <input list="departments" className="input" {...register('department', { required: 'Required' })} />
                <datalist id="departments">
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Field>
              <Field label="Course" required error={errors.course?.message}>
                <input className="input" placeholder="B.Tech / B.Sc / MBA" {...register('course', { required: 'Required' })} />
              </Field>
              <Field label="Branch" required error={errors.branch?.message}>
                <input className="input" {...register('branch', { required: 'Required' })} />
              </Field>
              <Field label="Semester" required error={errors.semester?.message}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="input"
                  {...register('semester', { required: 'Required', valueAsNumber: true })}
                />
              </Field>
            </>
          )}

          <Field label="Section" required error={errors.section?.message}>
            <input className="input" {...register('section', { required: 'Required' })} />
          </Field>
          <Field label="Academic Session" required error={errors.academicSession?.message}>
            <input className="input" placeholder="2025-2026" {...register('academicSession', { required: 'Required' })} />
          </Field>
          <Field label="Status">
            <select className="input" {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-xs text-slate-500 -mt-2">
          Fee totals are calculated automatically from the class Fee Structure (Settings → Fee Structure) once this
          student is saved — no need to enter a total here.
        </p>

        <Field label="Address">
          <textarea rows={2} className="input" {...register('address')} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
            {(isSubmitting || mutation.isPending) && <Spinner className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentFormModal;
