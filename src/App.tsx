import { lazy, Suspense, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { ProfileContext } from './components/profileContext';
import * as profileRepository from './data/profileRepository';
import { logError } from './platform/errorLog';
import { MachineDetailScreen } from './screens/MachineDetailScreen';
import { MachineFormScreen } from './screens/MachineFormScreen';
import { MachinesScreen } from './screens/MachinesScreen';
import { RoutineEditorScreen } from './screens/RoutineEditorScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen, inconsistentSets } from './screens/SettingsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlanDetailScreen } from './screens/PlanDetailScreen';
import { PlansScreen } from './screens/PlansScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

// Recharts is only downloaded when the Body or Progress screen opens.
const BodyScreen = lazy(() => import('./screens/BodyScreen'));
const ProgressScreen = lazy(() => import('./screens/ProgressScreen'));

function useProfileRow() {
  return useLiveQuery(async () => (await profileRepository.get()) ?? null, []);
}

function RequireProfile() {
  const profile = useProfileRow();
  if (profile === undefined) return null;
  if (profile === null) return <Navigate to="/welcome" replace />;
  return (
    <ProfileContext.Provider value={profile}>
      <Outlet />
    </ProfileContext.Provider>
  );
}

function WelcomeRoute() {
  const profile = useProfileRow();
  if (profile === undefined) return null;
  if (profile !== null) return <Navigate to="/" replace />;
  return <WelcomeScreen />;
}

export function AppRoutes() {
  const [inconsistent, setInconsistent] = useState(false);
  useEffect(() => {
    inconsistentSets().then(
      (n) => setInconsistent(n > 0),
      (error: unknown) => void logError('consistency', error),
    );
  }, []);

  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeRoute />} />
      <Route element={<RequireProfile />}>
        <Route element={<Layout consistencyWarning={inconsistent} />}>
          <Route index element={<HomeScreen />} />
          <Route path="plans" element={<PlansScreen />} />
          <Route path="plans/:id" element={<PlanDetailScreen />} />
          <Route path="session" element={<SessionScreen />} />
          <Route path="machines" element={<MachinesScreen />} />
          <Route path="machines/new" element={<MachineFormScreen />} />
          <Route path="machines/:id" element={<MachineDetailScreen />} />
          <Route path="machines/:id/edit" element={<MachineFormScreen />} />
          <Route path="routine" element={<RoutineEditorScreen />} />
          <Route
            path="body"
            element={
              <Suspense fallback={null}>
                <BodyScreen />
              </Suspense>
            }
          />
          <Route
            path="progress"
            element={
              <Suspense fallback={null}>
                <ProgressScreen />
              </Suspense>
            }
          />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
