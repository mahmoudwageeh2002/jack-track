import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';

import { confirmed, requireDatabase } from '@/core/utils/firestore-request';
import type { Plan, PlanDay, UserPlan } from '../domain/plan';
import type { PlanRepository } from '../domain/plan-repository';
import { validateCustomPlan, validateDays } from '../domain/validate-plan';
import { requireOnline } from '@/features/offline/data/connectivity';
import { offlineStorage } from '@/features/offline/data/offline-storage';

function toPlan(id: string, data: Record<string, unknown>): Plan {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return { ...(data as Omit<Plan, 'id' | 'createdAt'>), id, createdAt: createdAt?.toDate?.() ?? new Date(0) };
}

export class FirebasePlanRepository implements PlanRepository {
  async getPublicPlans() {
    const snapshot = await confirmed(getDocs(query(collection(requireDatabase(), 'plans'), where('isOfficial', '==', true))));
    return snapshot.docs.map((item) => toPlan(item.id, item.data()));
  }

  async getOwnedPlans(userId: string) {
    const snapshot = await confirmed(getDocs(query(collection(requireDatabase(), 'plans'), where('ownerId', '==', userId))));
    return snapshot.docs.map((item) => toPlan(item.id, item.data()));
  }

  async getPlan(id: string) {
    const snapshot = await confirmed(getDoc(doc(requireDatabase(), 'plans', id)));
    return snapshot.exists() ? toPlan(snapshot.id, snapshot.data()) : null;
  }

  async getActivePlan(userId: string): Promise<UserPlan | null> {
    const database = requireDatabase();
    const user = await confirmed(getDoc(doc(database, 'users', userId)));
    const id = user.data()?.activePlanId;
    if (typeof id !== 'string') return null;
    const snapshot = await confirmed(getDoc(doc(database, 'users', userId, 'plans', id)));
    return snapshot.exists() ? toPlan(snapshot.id, snapshot.data()) as UserPlan : null;
  }

  async selectPlan(userId: string, planId: string, days?: PlanDay[]) {
    requireOnline();
    const database = requireDatabase();
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error('This plan is no longer available.');
    validateDays(days ?? plan.days);
    const selected: UserPlan = {
      ...plan, days: days ?? plan.days, ownerId: userId,
      sourcePlanId: plan.id, isCustom: !plan.isOfficial,
    };
    const batch = writeBatch(database);
    batch.set(doc(database, 'users', userId, 'plans', plan.id), { ...selected, createdAt: serverTimestamp() });
    batch.set(doc(database, 'users', userId), { activePlanId: plan.id }, { merge: true });
    await confirmed(batch.commit());
    await offlineStorage.cache(userId, 'active-plan', selected);
    return selected;
  }

  async createCustomPlan(userId: string, input: Omit<UserPlan, 'ownerId'>) {
    requireOnline();
    validateCustomPlan(input);
    const database = requireDatabase();
    const plan: UserPlan = { ...input, ownerId: userId, isOfficial: false, isCustom: true };
    const batch = writeBatch(database);
    const data = { ...plan, createdAt: serverTimestamp() };
    batch.set(doc(database, 'plans', plan.id), data);
    batch.set(doc(database, 'users', userId, 'plans', plan.id), data);
    batch.set(doc(database, 'users', userId), { activePlanId: plan.id }, { merge: true });
    await confirmed(batch.commit());
    await offlineStorage.cache(userId, 'active-plan', plan);
    return plan;
  }
}
