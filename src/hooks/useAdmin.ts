import { useAuth } from './useAuth';

export const useAdmin = () => {
  const { user, userData, loading } = useAuth();
  
  const isAdmin = userData?.isAdmin || false;
  
  return {
    isAdmin,
    loading,
    user,
    userData
  };
};