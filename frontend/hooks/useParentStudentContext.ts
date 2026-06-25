import { useEffect, useMemo, useState } from "react";
import { router, usePathname } from "expo-router";
import {
  getParentSelectedChild,
  setParentSelectedChild,
} from "@/utils/parentSelectedChild";

type RawParams = Record<string, string | string[] | undefined>;

type ParentStudentContext = {
  studentId: string;
  studentName: string;
  classId: string;
  ready: boolean;
};

function toStringValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export function useParentStudentContext(
  rawParams: RawParams,
  options?: { autoInjectParams?: boolean; persistWhenParamPresent?: boolean }
): ParentStudentContext {
  const pathname = usePathname();
  const autoInjectParams = options?.autoInjectParams ?? true;
  const persistWhenParamPresent = options?.persistWhenParamPresent ?? true;

  const paramStudentId = toStringValue(rawParams.studentId);
  const paramStudentName = toStringValue(rawParams.studentName);
  const paramClassId = toStringValue(rawParams.classId);

  const [state, setState] = useState<ParentStudentContext>({
    studentId: paramStudentId,
    studentName: paramStudentName,
    classId: paramClassId,
    ready: false,
  });

  const paramsSnapshot = useMemo(
    () => ({ ...rawParams }),
    [rawParams.studentId, rawParams.studentName, rawParams.classId]
  );

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const fromParams = {
        studentId: paramStudentId,
        studentName: paramStudentName,
        classId: paramClassId,
      };

      if (fromParams.studentId) {
        if (persistWhenParamPresent) {
          await setParentSelectedChild(fromParams);
        }
        if (!active) return;
        setState({ ...fromParams, ready: true });
        return;
      }

      const saved = await getParentSelectedChild();
      const merged = {
        studentId: saved?.studentId || "",
        studentName: fromParams.studentName || saved?.studentName || "",
        classId: fromParams.classId || saved?.classId || "",
      };

      if (autoInjectParams && merged.studentId) {
        router.replace({
          pathname: pathname as any,
          params: {
            ...paramsSnapshot,
            studentId: merged.studentId,
            studentName: merged.studentName,
            classId: merged.classId,
          } as any,
        });
      }

      if (!active) return;
      setState({ ...merged, ready: true });
    };

    hydrate();

    return () => {
      active = false;
    };
  }, [
    paramStudentId,
    paramStudentName,
    paramClassId,
    autoInjectParams,
    persistWhenParamPresent,
    pathname,
    paramsSnapshot,
  ]);

  return state;
}
