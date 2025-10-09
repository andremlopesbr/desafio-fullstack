import { useContext } from 'react';
import { ApiDataContext } from '../contexts/ApiDataContext';

export function useApiData() {
  const context = useContext(ApiDataContext);
  if (context === undefined) {
    throw new Error('useApiData must be used within an ApiDataProvider');
  }
  return context;
}