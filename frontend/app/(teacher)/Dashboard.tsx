'use client';

import React, { useEffect, useState } from 'react';
import { useSchool } from '@/contexts/SchoolContext';
import { useSession } from 'next-auth/react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { fetchTeacherData, createAssignment } from '@/services/TeacherService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { toast } from 'react-hot-toast';

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  classId: string;
};

type Class = {
  id: string;
  name: string;
};

const assignmentSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  dueDate: Yup.date()
    .required('Due date is required')
    .min(new Date(), 'Due date must be in the future'),
  classId: Yup.string().required('Class selection is required'),
});

const TeacherDashboard = () => {
  const { data: session } = useSession();
  const { schoolId } = useSchool();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTab, setActiveTab] = useState('assignments');

  useEffect(() => {
    if (schoolId && session?.user?.id) {
      const loadData = async () => {
        try {
          setLoading(true);
          const [assignmentsData, studentsData, classesData] = await Promise.all([
            fetchTeacherData(session.user.id, schoolId, 'assignments') as Promise<Assignment[]>,
            fetchTeacherData(session.user.id, schoolId, 'students') as Promise<Student[]>,
            fetchTeacherData(session.user.id, schoolId, 'classes') as Promise<Class[]>,
          ]);

          setAssignments(assignmentsData);
          setStudents(studentsData);
          setClasses(classesData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [schoolId, session]);

  const handleCreateAssignment = async (values: any, { resetForm }: any) => {
    try {
      if (!schoolId || !session?.user?.id) {
        throw new Error('Missing school ID or user session');
      }

      const newAssignment = await createAssignment({
        title: values.title,
        description: values.description,
        dueDate: values.dueDate,
        classId: values.classId,
        teacherId: session.user.id,
        schoolId: schoolId,
      });

      setAssignments([...assignments, newAssignment]);
      resetForm();
      toast.success('Assignment created successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assignment';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <div className="badge badge-info">School ID: {schoolId}</div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed mb-8">
        <button
          className={`tab ${activeTab === 'assignments' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>
        <button
          className={`tab ${activeTab === 'students' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Students
        </button>
        <button
          className={`tab ${activeTab === 'classes' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          Classes
        </button>
      </div>

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          <div className="card bg-base-100 shadow-lg mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Create New Assignment</h2>
              <Formik
                initialValues={{
                  title: '',
                  description: '',
                  dueDate: '',
                  classId: '',
                }}
                validationSchema={assignmentSchema}
                onSubmit={handleCreateAssignment}
              >
                {({ isSubmitting, isValid }) => (
                  <Form>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Title</span>
                        </label>
                        <Field
                          type="text"
                          name="title"
                          className="input input-bordered"
                          placeholder="Assignment Title"
                        />
                        <ErrorMessage
                          name="title"
                          component="div"
                          className="text-error text-sm mt-1"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Class</span>
                        </label>
                        <Field
                          as="select"
                          name="classId"
                          className="select select-bordered"
                        >
                          <option value="">Select a class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="classId"
                          component="div"
                          className="text-error text-sm mt-1"
                        />
                      </div>
                    </div>

                    <div className="form-control mt-4">
                      <label className="label">
                        <span className="label-text">Description</span>
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        className="textarea textarea-bordered h-24"
                        placeholder="Assignment description..."
                      />
                      <ErrorMessage
                        name="description"
                        component="div"
                        className="text-error text-sm mt-1"
                      />
                    </div>

                    <div className="form-control mt-4">
                      <label className="label">
                        <span className="label-text">Due Date</span>
                      </label>
                      <Field
                        type="datetime-local"
                        name="dueDate"
                        className="input input-bordered"
                      />
                      <ErrorMessage
                        name="dueDate"
                        component="div"
                        className="text-error text-sm mt-1"
                      />
                    </div>

                    <div className="card-actions justify-end mt-6">
                      <button
                        type="submit"
                        disabled={isSubmitting || !isValid}
                        className="btn btn-primary"
                      >
                        {isSubmitting ? (
                          <span className="loading loading-spinner"></span>
                        ) : (
                          'Create Assignment'
                        )}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4">Your Assignments</h2>
          {assignments.length === 0 ? (
            <div className="alert alert-info">
              <span>No assignments created yet.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => {
                const classInfo = classes.find((c) => c.id === assignment.classId);
                return (
                  <div key={assignment.id} className="card bg-base-100 shadow">
                    <div className="card-body">
                      <h3 className="card-title">{assignment.title}</h3>
                      <p>{assignment.description}</p>
                      <div className="text-sm text-gray-500 mt-2">
                        <p>
                          <strong>Due:</strong>{' '}
                          {new Date(assignment.dueDate).toLocaleString()}
                        </p>
                        <p>
                          <strong>Class:</strong> {classInfo?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="card-actions justify-end mt-4">
                        <button className="btn btn-sm btn-outline">View Submissions</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Students</h2>
          {students.length === 0 ? (
            <div className="alert alert-info">
              <span>No students found in your classes.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Class</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const classInfo = classes.find((c) => c.id === student.classId);
                    return (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>{student.email}</td>
                        <td>{classInfo?.name || 'Unknown'}</td>
                        <td>
                          <button className="btn btn-xs btn-outline">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Classes</h2>
          {classes.length === 0 ? (
            <div className="alert alert-info">
              <span>No classes assigned to you.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="card bg-base-100 shadow">
                  <div className="card-body">
                    <h3 className="card-title">{cls.name}</h3>
                    <div className="flex justify-between items-center mt-4">
                      <div className="badge badge-primary">
                        {students.filter((s) => s.classId === cls.id).length} students
                      </div>
                      <div className="badge badge-secondary">
                        {assignments.filter((a) => a.classId === cls.id).length} assignments
                      </div>
                    </div>
                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-sm btn-outline">View Class</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;