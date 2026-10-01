import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from 'firebase/auth';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

type AuthState = {
  user: AuthUser | null;
  initialized: boolean;
};

const initialState: AuthState = {
  user: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStateChanged(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.initialized = true;
    },
  },
});

export const { authStateChanged } = authSlice.actions;
export const authReducer = authSlice.reducer;

export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}
