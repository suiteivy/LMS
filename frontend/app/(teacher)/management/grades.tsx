import { Redirect } from "expo-router";
import React from "react";

export default function TeacherGradesRedirect() {
    return <Redirect href="/(teacher)/management/grade-entry" />;
}
