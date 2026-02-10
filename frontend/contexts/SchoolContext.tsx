'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type SchoolContextType = {
  schoolId: string | null;
  setSchoolId: (id: string | null) => void;
};

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [schoolId, setSchoolId] = useState<string | null>(null);

  return (
    <SchoolContext.Provider value={{ schoolId, setSchoolId }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
