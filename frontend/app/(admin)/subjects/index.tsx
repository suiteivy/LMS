import { Redirect } from 'expo-router';
import React from 'react';

export default function SubjectsRedirect() {
    return <Redirect href="/(admin)/management/subjects" />;
}
