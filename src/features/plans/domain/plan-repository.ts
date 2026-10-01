import type { Plan, PlanDay, UserPlan } from './plan';

export interface PlanRepository {
  getPublicPlans(): Promise<Plan[]>;
  getOwnedPlans(userId: string): Promise<Plan[]>;
  getActivePlan(userId: string): Promise<UserPlan | null>;
  getPlan(id: string): Promise<Plan | null>;
  selectPlan(userId: string, planId: string, days?: PlanDay[]): Promise<UserPlan>;
  createCustomPlan(userId: string, plan: Omit<UserPlan, 'ownerId'>): Promise<UserPlan>;
}
