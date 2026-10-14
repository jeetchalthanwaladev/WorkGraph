import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, status: "loading" },
  reducers: {
    sessionLoaded(state, action) {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "anonymous";
    },
    signedOut(state) {
      state.user = null;
      state.status = "anonymous";
    },
  },
});

export const { sessionLoaded, signedOut } = authSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer } });
