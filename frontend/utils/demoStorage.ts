import demoDummyData from '@/demoDummyData';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_STATE_KEY = 'demo_state_v1';

type DemoUser = {
  user: any;
  roleRecord: any;
};

type DemoState = {
  assignmentSubmissions: Record<string, any>;
  userOverrides: Record<string, Partial<DemoUser>>;
  deletedUserIds: string[];
  createdUsers: DemoUser[];
};

const emptyState = (): DemoState => ({
  assignmentSubmissions: {},
  userOverrides: {},
  deletedUserIds: [],
  createdUsers: [],
});

export const loadDemoState = async (): Promise<DemoState> => {
  try {
    const raw = await AsyncStorage.getItem(DEMO_STATE_KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...JSON.parse(raw) };
  } catch (error) {
    console.warn('[demoStorage] Failed to load demo state:', error);
    return emptyState();
  }
};

export const saveDemoState = async (state: DemoState) => {
  await AsyncStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
};

export const resetDemoState = async () => {
  await AsyncStorage.removeItem(DEMO_STATE_KEY);
};

const seedDemoUsers = (): DemoUser[] => [
  { user: demoDummyData.users.admin, roleRecord: demoDummyData.roleRecords.admin },
  { user: demoDummyData.users.teacher, roleRecord: demoDummyData.roleRecords.teacher },
  { user: demoDummyData.users.student, roleRecord: demoDummyData.roleRecords.student },
  { user: demoDummyData.users.parent, roleRecord: demoDummyData.roleRecords.parent },
];

export const getDemoUsers = async (): Promise<DemoUser[]> => {
  const state = await loadDemoState();
  const users = [...seedDemoUsers(), ...state.createdUsers]
    .filter(item => !state.deletedUserIds.includes(item.user.id))
    .map(item => {
      const override = state.userOverrides[item.user.id] || {};
      return {
        user: { ...item.user, ...(override.user || {}) },
        roleRecord: { ...item.roleRecord, ...(override.roleRecord || {}) },
      };
    });

  return users;
};

export const getDemoUser = async (id: string): Promise<DemoUser | null> => {
  const users = await getDemoUsers();
  return users.find(item => item.user.id === id || item.roleRecord.id === id) || null;
};

export const saveDemoUser = async (id: string, update: Partial<DemoUser>) => {
  const state = await loadDemoState();
  state.userOverrides[id] = {
    user: { ...(state.userOverrides[id]?.user || {}), ...(update.user || {}) },
    roleRecord: { ...(state.userOverrides[id]?.roleRecord || {}), ...(update.roleRecord || {}) },
  };
  await saveDemoState(state);
};

export const createDemoUser = async (entry: DemoUser) => {
  const state = await loadDemoState();
  state.createdUsers = [entry, ...state.createdUsers.filter(item => item.user.id !== entry.user.id)];
  await saveDemoState(state);
};

export const deleteDemoUser = async (id: string) => {
  const state = await loadDemoState();
  state.deletedUserIds = Array.from(new Set([...state.deletedUserIds, id]));
  state.createdUsers = state.createdUsers.filter(item => item.user.id !== id);
  delete state.userOverrides[id];
  await saveDemoState(state);
};

export const getDemoAssignmentSubmissions = async () => {
  const state = await loadDemoState();
  return state.assignmentSubmissions;
};

export const saveDemoAssignmentSubmission = async (assignmentId: string, submission: any) => {
  const state = await loadDemoState();
  state.assignmentSubmissions[assignmentId] = submission;
  await saveDemoState(state);
};
