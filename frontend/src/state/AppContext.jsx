import React, { createContext, useContext, useMemo, useReducer } from 'react'

const initialState = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || '',
  selectedFile: null,
  selectedFileUrl: '',
  processing: false,
  error: '',
  // Results from backend
  result: null,
  // Settings
  settings: {
    colormap: true,
    pointSize: 1.5,
    mode: 'auto',
    view3DMode: 'points',
    meshSmoothing: 0.0,
    directionalLight: 1.0,
    ambientLight: 0.2,
  },
}

const AppContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, selectedFile: action.file, selectedFileUrl: action.url }
    case 'SET_PROCESSING':
      return { ...state, processing: action.value }
    case 'SET_ERROR':
      return { ...state, error: action.message }
    case 'SET_RESULT':
      return { ...state, result: action.result }
    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }
    case 'SET_BACKEND_URL':
      return state
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}


