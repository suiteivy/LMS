import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "parent:selected-child";

export type ParentSelectedChild = {
  studentId: string;
  studentName?: string;
  classId?: string;
};

export async function getParentSelectedChild(): Promise<ParentSelectedChild | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParentSelectedChild;
    if (!parsed?.studentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setParentSelectedChild(child: ParentSelectedChild): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(child));
  } catch {
    // no-op
  }
}

export async function clearParentSelectedChild(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
