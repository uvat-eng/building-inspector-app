import { useContext, useMemo } from 'react';
import { useUsers, User } from '@/data/users';
import { useObjects } from '@/data/store';
import { useProfile } from '@/data/profile';
import { ChiefScopeContext } from '@/data/chiefScope';

export const useChiefScope = () => {
  const { profile } = useProfile();
  const { users } = useUsers();
  const { list: objects } = useObjects();
  const override = useContext(ChiefScopeContext);

  const wide =
    !override && ['admin', 'director', 'manager', 'pm', 'coordinator'].includes(profile.role);

  const myObjectIds = useMemo(
    () => override?.objectIds ?? profile.objects ?? [],
    [override, profile.objects],
  );
  const myLocations = useMemo(
    () => (override ? [] : (profile.locations ?? [])),
    [override, profile.locations],
  );
  const chiefFio = override?.chiefFio ?? profile.fio;

  const scopeObjects = useMemo(() => {
    if (wide) return objects;
    if (myObjectIds.length > 0) return objects.filter((o) => myObjectIds.includes(o.id));
    if (myLocations.length > 0) return objects.filter((o) => myLocations.includes(o.location));
    return [];
  }, [wide, objects, myObjectIds, myLocations]);

  const scopeObjectIds = useMemo(() => scopeObjects.map((o) => o.id), [scopeObjects]);
  const scopeTitles = useMemo(() => scopeObjects.map((o) => o.title), [scopeObjects]);

  const team = useMemo(() => {
    const staff = users.filter((u: User) => ['inspector', 'driver', 'mechanic'].includes(u.role));
    if (wide) return staff;
    return staff.filter(
      (u: User) =>
        u.chief === chiefFio ||
        (u.objects ?? []).some((id) => scopeObjectIds.includes(id)) ||
        (u.locations ?? []).some((l) => myLocations.includes(l)),
    );
  }, [users, wide, chiefFio, scopeObjectIds, myLocations]);

  const inspectors = useMemo(() => team.filter((u: User) => u.role === 'inspector'), [team]);
  const drivers = useMemo(() => team.filter((u: User) => u.role === 'driver'), [team]);

  const teamNames = useMemo(() => team.map((u: User) => u.fio), [team]);

  const inScope = (v: { objectId?: string; objectTitle?: string; author?: string }) => {
    if (wide) return true;
    if (v.objectId && scopeObjectIds.includes(v.objectId)) return true;
    if (v.objectTitle && scopeTitles.includes(v.objectTitle)) return true;
    if (v.author && teamNames.includes(v.author)) return true;
    return false;
  };

  return {
    wide,
    profile,
    objects: scopeObjects,
    objectIds: scopeObjectIds,
    objectTitles: scopeTitles,
    team,
    inspectors,
    drivers,
    teamNames,
    inScope,
  };
};
