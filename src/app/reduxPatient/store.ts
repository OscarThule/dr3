import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import profileReducer from './slices/patient/profileSlice'
import bookingReducer from './slices/patient/bookingSlice'
import entryReducer from './slices/patient/entrySlice'

export const store = configureStore({
  reducer: {
    profile: profileReducer, 
    
    
   
  },
 
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector