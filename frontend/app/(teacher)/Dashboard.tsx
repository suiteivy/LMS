'use client'; 
import React, { useContext, useEffect, useState } from 'react';
import { SchoolContext } from '@/context/SchoolContext';
import { useSession } from 'next-auth/react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { fetchTeacherData, createAssignment, updateTeacherProfile } from '@/services/teacherService';
import { Assignment, Student, Class } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';

// Validation schema for the assignment form
const assignmentSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string().required('Description is required'),
  dueDate: Yup.date().required('Due date is required').min(new Date(), 'Due date must be in the future'),
  classId: Yup.string().required('Class selection is required')
});

const TeacherDashboard = () => {
  const { data: session } = useSession();
  const { schoolId } = useContext(SchoolContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTab, setActiveTab] = useState('assignments');

  useEffect(() => {
    if (schoolId && session?.user?.id) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const [assignmentsData, studentsData, classesData] = await Promise.all([
            fetchTeacherData(session.user.id, schoolId, 'assignments'),
            fetchTeacherData(session.user.id, schoolId, 'students'),
            fetchTeacherData(session.user.id, schoolId, 'classes')
          ]);
          
          setAssignments(assignmentsData);
          setStudents(studentsData);
          setClasses(classesData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [schoolId, session]);

  const handleCreateAssignment = async (values: any, { resetForm }: any) => {
    try {
      const newAssignment = await createAssignment({
        ...values,
        teacherId: session?.user?.id,
        schoolId
      });
      setAssignments([...assignments, newAssignment]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  const handleProfileUpdate = async (values: any) => {
    try {
      await updateTeacherProfile(session?.user?.id, values);
      // Handle success (maybe show a toast notification)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>
      
      {/* Navigation Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 ${activeTab === 'assignments' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'students' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Students
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'profile' ? 'border-b-2 border-blue-500' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </div>

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Create New Assignment</h2>
          <Formik
            initialValues={{
              title: '',
              description: '',
              dueDate: '',
              classId: ''
            }}
            validationSchema={assignmentSchema}
            onSubmit={handleCreateAssignment}
          >
            {({ isSubmitting }) => (
              <Form className="mb-8">
                <div className="mb-4">
                  <label className="block mb-2">Title</label>
                  <Field
                    type="text"
                    name="title"
                    className="w-full p-2 border rounded"
                  />
                  <ErrorMessage name="title" component="div" className="text-red-500" />
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Description</label>
                  <Field
                    as="textarea"
                    name="description"
                    className="w-full p-2 border rounded"
                    rows={4}
                  />
                  <ErrorMessage name="description" component="div" className="text-red-500" />
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Due Date</label>
                  <Field
                    type="datetime-local"
                    name="dueDate"
                    className="w-full p-2 border rounded"
                  />
                  <ErrorMessage name="dueDate" component="div" className="text-red-500" />
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Class</label>
                  <Field
                    as="select"
                    name="classId"
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="classId" component="div" className="text-red-500" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {isSubmitting ? 'Creating...' : 'Create Assignment'}
                </button>
              </Form>
            )}
          </Formik>

          <h2 className="text-2xl font-semibold mb-4">Your Assignments</h2>
          {assignments.length === 0 ? (
            <p>No assignments yet.</p>
          ) : (
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border p-4 rounded-lg">
                  <h3 className="font-bold text-lg">{assignment.title}</h3>
                  <p className="text-gray-600">{assignment.description}</p>
                  <p className="text-sm text-gray-500">
                    Due: {new Date(assignment.dueDate).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    Class: {classes.find(c => c.id === assignment.classId)?.name || 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Students</h2>
          {students.length === 0 ? (
            <p>No students in your classes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border">Name</th>
                    <th className="py-2 px-4 border">Email</th>
                    <th className="py-2 px-4 border">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="py-2 px-4 border">{student.name}</td>
                      <td className="py-2 px-4 border">{student.email}</td>
                      <td className="py-2 px-4 border">
                        {classes.find(c => c.id === student.classId)?.name || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
          <Formik
            initialValues={{
              name: session?.user?.name || '',
              email: session?.user?.email || '',
              bio: ''
            }}
            onSubmit={handleProfileUpdate}
          >
            {({ isSubmitting }) => (
              <Form>
                <div className="mb-4">
                  <label className="block mb-2">Name</label>
                  <Field
                    type="text"
                    name="name"
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Email</label>
                  <Field
                    type="email"
                    name="email"
                    className="w-full p-2 border rounded"
                    disabled
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Bio</label>
                  <Field
                    as="textarea"
                    name="bio"
                    className="w-full p-2 border rounded"
                    rows={4}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {isSubmitting ? 'Updating...' : 'Update Profile'}
                </button>
              </Form>
            )}
          </Formik>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;