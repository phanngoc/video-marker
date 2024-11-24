import { configureStore, createSlice } from '@reduxjs/toolkit';

const librarySlice = createSlice({
  name: 'library',
  initialState: {
    selectedMedia: null,
  },
  reducers: {
    setSelectedMedia: (state, action) => {
      state.selectedMedia = action.payload;
    },
  },
});

export const { setSelectedMedia } = librarySlice.actions;

const store = configureStore({
  reducer: {
    library: librarySlice.reducer,
  },
});

export default store;
