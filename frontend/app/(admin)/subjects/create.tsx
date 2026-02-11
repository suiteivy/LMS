import { Redirect } from 'expo-router';
import React from 'react';

export default function SubjectsCreateRedirect() {
    return <Redirect href="/(admin)/management/subjects/create" />;
}
